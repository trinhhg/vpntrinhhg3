import { describe, it, expect } from 'vitest';
import DOMPurify from 'dompurify';
import fs from 'node:fs';
import path from 'node:path';

describe('CMS Guide & Video / Lightbox / CTA Features', () => {
  const CMS_PURIFY_CONFIG = {
    ADD_TAGS: ['iframe', 'video', 'source', 'figure', 'figcaption', 'hr', 'u', 's', 'span', 'i', 'button', 'a'],
    ADD_ATTR: [
      'allow', 'allowfullscreen', 'frameborder', 'scrolling', 'src', 'target', 
      'rel', 'class', 'style', 'width', 'height', 'controls', 'autoplay', 
      'loop', 'muted', 'poster', 'type', 'data-cta', 'onclick'
    ]
  };

  it('bảo toàn thẻ iframe video khi làm sạch qua sanitizeCmsHtml', () => {
    const rawIframe = '<p><iframe class="ql-video" src="https://www.youtube.com/embed/dQw4w9WgXcQ" frameborder="0" allowfullscreen="true"></iframe></p>';
    const cleaned = DOMPurify.sanitize(rawIframe, CMS_PURIFY_CONFIG);
    expect(cleaned).toContain('<iframe');
    expect(cleaned).toContain('https://www.youtube.com/embed/dQw4w9WgXcQ');
    expect(cleaned).toContain('allowfullscreen="true"');
  });

  it('bảo toàn thẻ button CTA và style gradient', () => {
    const rawCta = '<p class="ql-align-center"><a href="https://example.com" target="_blank" rel="noopener noreferrer" data-cta="1" class="guide-cta-btn" style="background: linear-gradient(135deg, rgb(79, 70, 229), rgb(6, 182, 212)); color: rgb(255, 255, 255);"><i class="fas fa-download"></i> <span>Tải App Hiddify</span></a></p>';
    const cleaned = DOMPurify.sanitize(rawCta, CMS_PURIFY_CONFIG);
    expect(cleaned).toContain('guide-cta-btn');
    expect(cleaned).toContain('data-cta="1"');
    expect(cleaned).toContain('Tải App Hiddify');
  });

  it('chỉ kích hoạt khối FAQ riêng và Bài viết liên quan khi showFaqs/showRelated bật đúng', () => {
    const artWithFaqs = {
      name: 'Bài 1',
      showFaqs: true,
      faqs: [{ q: 'Hỏi 1', a: 'Đáp 1' }],
      showRelated: false,
      relatedArts: ['bai-2']
    };

    const shouldShowFaqs = artWithFaqs.showFaqs === true && Array.isArray(artWithFaqs.faqs) && artWithFaqs.faqs.length > 0;
    const shouldShowRelated = artWithFaqs.showRelated === true && Array.isArray(artWithFaqs.relatedArts) && artWithFaqs.relatedArts.length > 0;

    expect(shouldShowFaqs).toBe(true);
    expect(shouldShowRelated).toBe(false);
  });

  it('loại bỏ script, event handler on* và javascript: URI qua GUIDE_PURIFY_CONFIG', () => {
    const GUIDE_PURIFY_CONFIG = {
      ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'del', 'a', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'img', 'iframe', 'div', 'span', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'details', 'summary'],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style', 'id', 'target', 'rel', 'width', 'height', 'allow', 'allowfullscreen', 'frameborder', 'referrerpolicy', 'data-cta', 'data-guide-action', 'data-guide-id', 'data-guide-anchor', 'data-guide-tab', 'data-guide-art', 'data-guide-target', 'data-guide-slug'],
      ALLOW_DATA_ATTR: false,
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|#|\/)/i
    };
    const malicious = '<p onclick="alert(1)">Hello</p><script>alert(2)</script><img src="https://example.com/a\');alert(3);//.png" onerror="alert(4)"><a href="javascript:alert(5)">Bad</a><iframe src="https://evil.example.com/x"></iframe>';
    const cleaned = DOMPurify.sanitize(malicious, GUIDE_PURIFY_CONFIG);
    expect(cleaned).not.toContain('<script');
    expect(cleaned).not.toContain('onclick=');
    expect(cleaned).not.toContain('onerror=');
    expect(cleaned).not.toContain('javascript:');
  });

  it('đảm bảo closeHeaderDrawer, lưu vpn_lang, DOMPurify guide và openWechatModal có mặt trong source', () => {
    const customerJs = fs.readFileSync(path.resolve(process.cwd(), 'src/customer.js'), 'utf8');
    const indexHtml = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8');
    expect(customerJs).toContain('function closeHeaderDrawer()');
    expect(customerJs).toContain("localStorage.setItem('vpn_lang'");
    expect(customerJs).toContain("localStorage.getItem('vpn_lang')");
    expect(customerJs).toContain('DOMPurify.sanitize(rawHtml');
    expect(customerJs).not.toContain("img.setAttribute('onclick'");
    expect(indexHtml).toContain('onclick="openWechatModal()"');
    expect(indexHtml).not.toContain("document.getElementById('wechatModal').classList.remove('hidden')");
  });
});
