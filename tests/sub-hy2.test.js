import { describe, it, expect } from 'vitest';
import * as workerMod from '../worker.js';

const {
  parseURI,
  processB64,
  buildYaml,
  buildSingboxFull,
  proxyToInline,
  proxyToSingbox,
  proxyToUri,
  mergeSubscriptionRules,
  buildGlobalRouter,
  cleanLiangxinNode,
  cleanDjjcNode,
  cleanKittyNode,
} = workerMod;

describe('Hidden Subscription & Hysteria2 (hy2) Technical Audit (TDD)', () => {
  const infoNames = [
    '⏰ HSD: 25/12/2026',
    '🌐 Website: vpntrinhhg.pages.dev',
    '📞 Zalo hỗ trợ: 0917678211',
  ];
  const VP = 'vless://00000000-0000-0000-0000-000000000000@127.0.0.1:1?type=tcp#';

  it('TC-S01: Exports subscription helpers and parses/round-trips hy2 TLS & port-hopping faithfully', () => {
    expect(typeof parseURI).toBe('function');
    expect(typeof proxyToUri).toBe('function');
    expect(typeof proxyToInline).toBe('function');
    expect(typeof proxyToSingbox).toBe('function');

    const hy2Secure = parseURI(
      'hysteria2://p%40ss%3Aw%23rd@edge.example.com:60000?sni=www.bing.com&alpn=h3&insecure=0&pinSHA256=abcdef123456&obfs=salamander&obfs-password=obf%211&mport=60000-65530#HY2_Secure'
    );
    expect(hy2Secure).toBeTruthy();
    expect(hy2Secure.password).toBe('p@ss:w#rd');
    expect(hy2Secure['skip-cert-verify']).toBe(false);
    expect(hy2Secure.sni).toBe('www.bing.com');
    expect(hy2Secure.fingerprint).toBe('abcdef123456');
    expect(hy2Secure.alpn).toEqual(['h3']);
    expect(hy2Secure.obfs).toBe('salamander');
    expect(hy2Secure['obfs-password']).toBe('obf!1');
    expect(hy2Secure.mport).toBe('60000-65530');
    expect(hy2Secure.ports).toBe('60000-65530');

    const roundUri = proxyToUri(hy2Secure);
    expect(roundUri).toContain('p%40ss%3Aw%23rd@');
    expect(roundUri).toContain('insecure=0');
    expect(roundUri).toContain('pinSHA256=abcdef123456');
    expect(roundUri).toContain('alpn=h3');
    expect(roundUri).toContain('obfs=salamander');
    expect(roundUri).toContain('mport=60000-65530');

    const inlineLine = proxyToInline(hy2Secure);
    const inlineObj = JSON.parse(inlineLine.replace(/^\s*-\s*/, ''));
    expect(inlineObj.fingerprint).toBe('abcdef123456');
    expect(inlineObj.alpn).toEqual(['h3']);
    expect(inlineObj['skip-cert-verify']).toBe(false);

    const sbObj = proxyToSingbox(hy2Secure);
    expect(sbObj.tls.enabled).toBe(true);
    expect(sbObj.tls.server_name).toBe('www.bing.com');
    expect(sbObj.tls.insecure).toBe(false);
    expect(sbObj.tls.alpn).toEqual(['h3']);
    expect(sbObj.server_ports).toEqual(['60000:65530']);
  });

  it('TC-S02: Unquoted inline YAML (Liangxin/DJJC hy2 + VLESS) preserves fingerprint, TLS & params in Base64, YAML, and Sing-box', () => {
    const sampleYaml = [
      'mixed-port: 7890',
      'proxies:',
      '  - {name: "\\U0001F1F8\\U0001F1EC新加坡专线01|BGP|流媒体", server: aws-linkhy9.lxyun.xyz, port: 60000, ports: 60000-65530, mport: 60000-65530, udp: true, skip-cert-verify: true, sni: iosapps.itunes.apple.com, type: hysteria2, password: 85dc1ebd-f9d5-4096-a687-0d9913a074a6, fingerprint: 2b6c9b75b2ef903fbe66ee91d1801941dea0ddb5429505ae3bce65e2fb17ad45}',
      '  - {name: "\\U0001F1ED\\U0001F1F0香港高速01|BGP|CMCU", type: vless, server: aws-link1.lxyun.xyz, port: 443, uuid: 85dc1ebd-f9d5-4096-a687-0d9913a074a6, udp: true, tls: true, skip-cert-verify: false, flow: xtls-rprx-vision, client-fingerprint: safari, servername: fastcdn.hoyoverse.com, reality-opts: {public-key: TF960L2RQcljFhnd6GKHRO82TGpefFLT25BY-KSuwxA, short-id: c8660f6e}}',
    ].join('\n');

    const { newB64, yamlStr, singboxStr, error } = processB64(sampleYaml, infoNames, VP, 'liangxin');
    expect(error).toBeUndefined();
    expect(yamlStr).toContain('🇸🇬');
    expect(yamlStr).toContain('2b6c9b75b2ef903fbe66ee91d1801941dea0ddb5429505ae3bce65e2fb17ad45');
    expect(yamlStr).toContain('"ports":"60000-65530"');
    expect(yamlStr).toContain('"skip-cert-verify":true');

    const decoded = Buffer.from(newB64, 'base64').toString('utf8');
    expect(decoded).not.toContain('%5CU0001F1F8');
    expect(decoded).toContain('pinSHA256=2b6c9b75b2ef903fbe66ee91d1801941dea0ddb5429505ae3bce65e2fb17ad45');
    expect(decoded).toContain('sni=iosapps.itunes.apple.com');
    expect(decoded).toContain('mport=60000-65530');
    expect(decoded).toContain('pbk=TF960L2RQcljFhnd6GKHRO82TGpefFLT25BY-KSuwxA');
    expect(decoded).toContain('sid=c8660f6e');
    expect(decoded).toContain('fp=safari');
    expect(decoded).toContain('flow=xtls-rprx-vision');

    const sb = JSON.parse(singboxStr);
    const hy2Out = sb.outbounds.find(o => o.type === 'hysteria2');
    expect(hy2Out.tls.insecure).toBe(true);
    expect(hy2Out.tls.server_name).toBe('iosapps.itunes.apple.com');
    expect(hy2Out.server_ports).toEqual(['60000:65530']);
  });

  it('TC-S03: Multi-line block Clash YAML (Kitty) parses completely without returning error', () => {
    const kittyYaml = [
      'proxies:',
      '  - client-fingerprint: chrome',
      '    encryption: none',
      '    flow: xtls-rprx-vision',
      '    name: "🇺🇸United States 01"',
      '    network: tcp',
      '    port: 443',
      '    reality-opts:',
      '      public-key: 0_UOGGSOr0NZqCA-nQo-Ct0MjQPfghmBL_sh6XU5pW8',
      '      short-id: 68306404e9ece429',
      '    server: us1.oh-node.com',
      '    servername: download-porter.hoyoverse.com',
      '    skip-cert-verify: false',
      '    tls: true',
      '    type: vless',
      '    udp: true',
      '    uuid: e2af293f-c5b0-47f2-9c4d-b41ff9346d61',
      'proxy-groups:',
      '  - name: select',
    ].join('\n');

    const res = processB64(kittyYaml, infoNames, VP, 'kitty');
    expect(res.error).toBeUndefined();
    expect(res.yamlStr).toContain('🇺🇸 VIP 美国 01 - VPNTrinhHg');
    expect(res.yamlStr).toContain('0_UOGGSOr0NZqCA-nQo-Ct0MjQPfghmBL_sh6XU5pW8');
    const sb = JSON.parse(res.singboxStr);
    expect(sb.outbounds.some(o => o.tag === '🇺🇸 VIP 美国 01 - VPNTrinhHg')).toBe(true);
  });

  it('TC-S04 & S05 & S06: Rule hygiene, zero mid-MATCH, no conflict, Kitty DNS & decoy SNI cleanup, 2- & 3-source combos', () => {
    const proxies = [{
      name: 'Node 1 - VPNTrinhHg',
      type: 'vless',
      server: 'example.com',
      port: 443,
      uuid: '11111111-1111-1111-1111-111111111111',
      tls: true,
    }];

    for (const mode of ['kitty', 'liangxin', 'djjc', 'combo_liki', 'combo_kidj', 'combo_lidj', 'combo_all']) {
      const y = buildYaml(proxies, infoNames, mode);
      const rulesIdx = y.indexOf('\nrules:');
      expect(rulesIdx).toBeGreaterThan(-1);
      const rulesBlock = y.slice(rulesIdx).split('\n').slice(1).map(l => l.trim().replace(/^- "/, '').replace(/"$/, ''));

      // Single final MATCH at exact bottom
      const matchIndices = rulesBlock.map((r, i) => (r.startsWith('MATCH,') ? i : -1)).filter(i => i >= 0);
      expect(matchIndices).toEqual([rulesBlock.length - 1]);
      expect(rulesBlock[rulesBlock.length - 1]).toBe('MATCH,VPN Trinh Hg');

      // No duplicate (type, value) keys and no conflicting actions
      const seen = new Map();
      for (const r of rulesBlock) {
        const parts = r.split(',');
        const key = parts[0] === 'MATCH' ? 'MATCH' : `${parts[0]},${parts[1]}`;
        expect(seen.has(key)).toBe(false);
        seen.set(key, parts[2] || parts[1]);
      }

      // Specific Apple proxy rules must appear BEFORE apple.com,DIRECT and GEOIP,CN
      if (rulesBlock.some(r => r.startsWith('DOMAIN,developer.apple.com,'))) {
        const idxDevApple = rulesBlock.findIndex(r => r.startsWith('DOMAIN,developer.apple.com,'));
        const idxAppleDir = rulesBlock.findIndex(r => r.startsWith('DOMAIN-SUFFIX,apple.com,'));
        if (idxAppleDir >= 0) expect(idxDevApple).toBeLessThan(idxAppleDir);
      }

      // Decoy SNI consumer domains must not be forced DIRECT
      expect(y).not.toContain('DOMAIN-SUFFIX,hoyoverse.com,DIRECT');
      expect(y).not.toContain('DOMAIN-SUFFIX,susercontent.com,DIRECT');
      expect(y).not.toContain('DOMAIN-SUFFIX,hsbc.com.hk,DIRECT');
    }

    // Kitty DNS sanity: domestic nameservers + fallback without invalid space fragments
    const ktYaml = buildYaml(proxies, infoNames, 'kitty');
    expect(ktYaml).toContain('223.5.5.5');
    expect(ktYaml).toContain('fallback:');
    expect(ktYaml).not.toContain('#VPN Trinh Hg');
    expect(ktYaml).toContain('DOMAIN,dns.cloudflare.com,VPN Trinh Hg');

    // DJJC essential rules restored
    const djYaml = buildYaml(proxies, infoNames, 'djjc');
    expect(djYaml).toContain('IP-CIDR,1.1.1.1/32,VPN Trinh Hg,no-resolve');
    expect(djYaml).toContain('DOMAIN,cn.bing.com,DIRECT');
    expect(djYaml).toContain('IP-CIDR,17.0.0.0/8,DIRECT');

    // Sing-box route order: proxy domain rules precede geoip cn
    const sb = JSON.parse(buildSingboxFull(proxies, infoNames, 'combo_all'));
    const cnGeoIdx = sb.route.rules.findIndex(r => Array.isArray(r.geoip) && r.geoip.includes('cn'));
    const proxyRuleIdx = sb.route.rules.findIndex(r => r.outbound === '节点选择');
    expect(proxyRuleIdx).toBeGreaterThan(-1);
    expect(proxyRuleIdx).toBeLessThan(cnGeoIdx);
  });

  it('TC-S07 & S08: buildGlobalRouter supports 3-source combos, /v1 cache-miss returns config, /api/push_data_batch guards empty', async () => {
    const router = buildGlobalRouter([
      {
        masked: 'https://vpntrinhhg3.pages.dev/v4/VPNTrinhHg?liki=tok123',
        isCombo: true,
        orig: 'https://sub1.7777699.xyz/api/v1/owo?OwO=aaa111222333',
        orig2: 'https://m1.tohno-1.top/oosaka/bbb111222333',
        orig3: 'https://sub.djjc.top/api/v1/client/subscribe?token=ccc111222333',
        provider: 'lx',
        provider2: 'kt',
        provider3: 'dj',
        expDate: '30/12/2026',
      },
    ]);
    expect(router.tok123).toBeTruthy();
    expect(router.tok123.tokens).toEqual(['aaa111222333', 'bbb111222333', 'ccc111222333']);
    expect(router.tok123.providers).toEqual(['lx', 'kt', 'dj']);

    // Mock KV & fetch for /api/push_data_batch & /v1 cache miss
    const kvStore = new Map([
      ['GLOBAL_ROUTER', JSON.stringify({
        miss123456: {
          origTok: 'origMiss123',
          origUrl: 'https://sub1.7777699.xyz/api/v1/owo?OwO=origMiss123',
          provider: 'lx',
          protocol: 'v1',
          expDate: '30/12/2026',
        },
      })],
      ['GLOBAL_SUBS', '{}'],
    ]);
    const mockKV = {
      get: async (k) => kvStore.get(k) ?? null,
      put: async (k, v) => { kvStore.set(k, v); },
      delete: async (k) => { kvStore.delete(k); },
    };
    const origFetch = globalThis.fetch;
    globalThis.fetch = async (u) => {
      if (String(u).includes('origMiss123')) {
        return new Response(
          'hysteria2://pw@s1.example.com:60000?sni=apple.com&insecure=1&pinSHA256=deadbeef#HK01',
          { status: 200 }
        );
      }
      return new Response('not found', { status: 404 });
    };
    try {
      const req = new Request('https://worker.example.com/v1/VPNTrinhHg?OwO=miss123456', {
        headers: { 'User-Agent': 'FlClash/v0.9.3' },
      });
      const res = await workerMod.default.fetch(
        req,
        { VPN_KV3: mockKV, ADMIN_PASSWORD: 'adm', WEB_API_SECRET2: 'sec2' },
        { waitUntil: () => {} }
      );
      const bodyText = await res.text();
      expect(bodyText).not.toContain('Gói cước không tồn tại');
      expect(bodyText).toContain('s1.example.com');
      expect(bodyText).toContain('deadbeef');

      const badPush = await workerMod.default.fetch(
        new Request('https://worker.example.com/api/push_data_batch', {
          method: 'POST',
          headers: { Authorization: 'Bearer sec2' },
          body: '{}',
        }),
        { VPN_KV3: mockKV, WEB_API_SECRET2: 'sec2' },
        { waitUntil: () => {} }
      );
      expect(badPush.status).toBe(400);
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});
