// ==UserScript==
// @name         智能字体管理器 (Pro 版)
// @namespace    http://tampermonkey.net/
// @version      1.6.3
// @description  支持全局字体、数字对齐、代码保护，修复 Chrome 更新后的 CSP 限制
// @author       Doris
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_addElement
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    const currentHost = window.location.hostname;
    let globalFont = GM_getValue('globalFontData', '');
    let isGlobalEnabled = GM_getValue('fontEnabled', true);
    let blacklist = GM_getValue('fontBlacklist', []);

    // 默认字体名称
    const activeFontName = "SOIGNESemiBold";

    function applyFont() {
        if (!isGlobalEnabled || blacklist.includes(currentHost) || !globalFont) return;

        // 使用 GM_addElement 以插件特权身份注入，绕过 CSP 限制
        GM_addElement('style', {
            id: 'doris-font-ultra',
            textContent: `
                @font-face {
                    font-family: "${activeFontName}";
                    src: url("${globalFont}");
                    font-display: block;
                }

                /* 预隐藏页面防止闪烁 */
                html { visibility: hidden; }

                /* 排除图标与代码区 */
                *:not(i):not([class*="icon"]):not([class*="material"]):not([class*="symbols"]):not([class*="fa-"]):not(svg):not(canvas):not(code):not(pre):not([class*="mono"]) {
                    font-family: "${activeFontName}", sans-serif !important;
                    font-variant-numeric: tabular-nums; /* 数字等宽对齐 */
                }

                /* 针对 GitHub / Gemini 的全局变量覆盖 */
                :root {
                    --gh-font-family-sans: "${activeFontName}", sans-serif !important;
                    --font-family-sans: "${activeFontName}", sans-serif !important;
                    --font-stack-monospace: ui-monospace, monospace !important;
                }

                .material-symbols-outlined {
                    font-family: 'Material Symbols Outlined' !important;
                    visibility: visible !important;
                }
            `
        });

        // 立即恢复页面可见
        GM_addElement('style', {
            textContent: `html { visibility: visible !important; }`
        });
    }

    applyFont();

    // 菜单管理
    GM_registerMenuCommand("🌓 开关功能", () => {
        GM_setValue('fontEnabled', !isGlobalEnabled);
        location.reload();
    });

    GM_registerMenuCommand("📤 上传字体", () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.ttf,.otf,.woff2';
        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (ev) => {
                GM_setValue('globalFontData', ev.target.result);
                location.reload();
            };
            reader.readAsDataURL(file);
        };
        input.click();
    });
})();
