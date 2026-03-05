// ==UserScript==
// @name         智能字体管理器 (Pro 版)
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  等宽数字对齐、代码区保护、毛玻璃UI、极致性能优化
// @author       Doris
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    const currentHost = window.location.hostname;
    let globalFont = GM_getValue('globalFontData', '');
    let isGlobalEnabled = GM_getValue('fontEnabled', true);
    let siteFonts = GM_getValue('siteFonts', {}); 
    let blacklist = GM_getValue('fontBlacklist', []);

    const activeFontData = siteFonts[currentHost] ? siteFonts[currentHost].data : globalFont;
    const activeFontName = siteFonts[currentHost] ? siteFonts[currentHost].name : "CustomFont";

    function applyFont() {
        if (!isGlobalEnabled || blacklist.includes(currentHost) || !activeFontData) return;

        const style = document.createElement('style');
        style.id = 'doris-font-pro';
        style.textContent = `
            @font-face {
                font-family: "${activeFontName}";
                src: url("${activeFontData}");
                font-display: block;
            }
            
            html { visibility: hidden; } 
            
            /* 1. 基础文字应用 + 数字等宽对齐 */
            *:not(i):not([class*="icon"]):not([class*="material"]):not([class*="symbols"]):not([class*="fa-"]):not(svg):not(canvas):not(code):not(pre):not([class*="mono"]):not([class*="code"]) {
                font-family: "${activeFontName}", sans-serif !important;
                font-variant-numeric: tabular-nums; /* 数字对齐优化 */
                -webkit-font-smoothing: antialiased; /* 字体平滑 */
            }
            
            /* 2. 增强代码区保护：不替换代码、输入框、以及 Monaco 编辑器 */
            code, pre, kbd, samp, .vscode-editor, .monaco-editor, textarea {
                font-family: ui-monospace, "Cascadia Code", "Consolas", monospace !important;
            }

            /* 3. 图标强效保护 */
            .material-symbols-outlined, .material-symbols-rounded, [class^="icon-"] {
                font-family: 'Material Symbols Outlined' !important;
                font-variant-numeric: normal;
            }
        `;
        document.documentElement.appendChild(style);
        
        const fastShow = document.createElement('style');
        fastShow.textContent = `html { visibility: visible !important; }`;
        document.documentElement.appendChild(fastShow);
    }

    applyFont();

    // --- 美化版 UI 弹窗 ---
    function showUploadModal(isSiteSpecific) {
        if (document.getElementById('font-modal-pro')) return;
        const modal = document.createElement('div');
        modal.id = 'font-modal-pro';
        modal.style = `
            position:fixed; top:0; left:0; width:100%; height:100%; 
            background:rgba(0,0,0,0.4); backdrop-filter:blur(4px); 
            display:flex; align-items:center; justify-content:center; z-index:999999;
        `;
        modal.innerHTML = `
            <div style="background:rgba(255,255,255,0.9); padding:28px; border-radius:20px; width:360px; box-shadow:0 20px 40px rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.3); font-family:sans-serif; transform:scale(0.9); transition:all 0.3s ease;">
                <h3 style="margin:0 0 8px 0; color:#1d1d1f;">${isSiteSpecific ? '🚀 站点特供' : '🌍 全局默认'}</h3>
                <p style="font-size:12px; color:#86868b; margin-bottom:20px;">上传字体文件，实时享受极致对齐体验</p>
                <input type="file" id="modal-input" accept=".ttf,.otf,.woff2" style="width:100%; margin-bottom:25px; font-size:13px;">
                <div style="display:flex; justify-content:flex-end;">
                    <button id="modal-close" style="padding:10px 20px; border:none; border-radius:10px; background:#0071e3; color:#fff; cursor:pointer; font-weight:500;">完成</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        setTimeout(() => modal.children[0].style.transform = 'scale(1)', 10);

        document.getElementById('modal-close').onclick = () => modal.remove();
        document.getElementById('modal-input').onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (isSiteSpecific) {
                    let s = GM_getValue('siteFonts', {});
                    s[currentHost] = { data: ev.target.result, name: file.name.split('.')[0] };
                    GM_setValue('siteFonts', s);
                } else {
                    GM_setValue('globalFontData', ev.target.result);
                    GM_setValue('globalFontName', file.name.split('.')[0]);
                }
                location.reload();
            };
            reader.readAsDataURL(file);
        };
    }

    // 菜单命令保持不变...
    GM_registerMenuCommand("🌓 开关功能", () => { GM_setValue('fontEnabled', !isGlobalEnabled); location.reload(); });
    GM_registerMenuCommand("🎯 设置此站特供", () => showUploadModal(true));
    GM_registerMenuCommand("📤 设置全局默认", () => showUploadModal(false));
})();
