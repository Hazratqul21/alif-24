import React, { useEffect, useRef } from 'react';

/**
 * MathContent
 * Renders text content and automatically processes any LaTeX formulas 
 * delimited by $, $$, \(, \), \[, \].
 */
const MathContent = ({ content, className = "" }) => {
    const containerRef = useRef(null);

    const preProcessMath = (text) => {
        if (!text || typeof text !== 'string') return text;
        
        // 1. Agar allaqachon LaTeX belgilari bo'lsa, tegmaymiz
        if (text.includes('$') || text.includes('\\(') || text.includes('\\[')) {
            return text;
        }

        let processed = text;

        // 2. Darajalarni aniqlash: (15-5)^2 yoki x^2 yoki 5^2
        // (...) ^ \text
        processed = processed.replace(/(\([^)]+\)|\w+)\s*\^\s*(\d+|[a-zA-Z])/g, '$$$1^{$2}$$');

        // 3. Odatiy kasrlarni aniqlash: 1/2, 15/4 (faqat raqamlar bo'lsa)
        // Faqat boshida yoki bo'sh joydan keyin kelsa (sana bo'lib qolmasligi uchun)
        processed = processed.replace(/(^|\s)(\d+)\/(\d+)(\s|$)/g, '$1$$\\frac{$2}{$3}$$ $4');

        return processed;
    };

    const displayContent = preProcessMath(content);

    useEffect(() => {
        if (containerRef.current && window.renderMathInElement) {
            try {
                window.renderMathInElement(containerRef.current, {
                    delimiters: [
                        { left: '$$', right: '$$', display: true },
                        { left: '$', right: '$', display: false },
                        { left: '\\(', right: '\\)', display: false },
                        { left: '\\[', right: '\\]', display: true }
                    ],
                    throwOnError: false,
                    ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code"],
                });
            } catch (err) {
                console.error("KaTeX rendering error:", err);
            }
        }
    }, [displayContent]);

    return (
        <div 
            ref={containerRef} 
            className={`math-content ${className}`}
            style={{ direction: 'ltr', unicodeBidi: 'isolate' }}
        >
            {displayContent}
        </div>
    );
};

export default MathContent;
