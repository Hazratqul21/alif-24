import React, { useEffect, useRef } from 'react';

/**
 * MathContent
 * Renders text content and automatically processes any LaTeX formulas 
 * delimited by $, $$, \(, \), \[, \].
 */
const MathContent = ({ content, className = "" }) => {
    const containerRef = useRef(null);

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
    }, [content]);

    return (
        <div 
            ref={containerRef} 
            className={`math-content ${className}`}
            style={{ direction: 'ltr', unicodeBidi: 'isolate' }}
        >
            {content}
        </div>
    );
};

export default MathContent;
