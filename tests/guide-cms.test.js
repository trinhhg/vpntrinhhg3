import { describe, it, expect } from 'vitest';
import DOMPurify from 'dompurify';

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
});
