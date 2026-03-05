// ==UserScript==
// @name         智能网页字体管理器 (站点精控版)
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  支持全局/站点独立字体、站点黑名单、图标自动保护，解决 Gemini 等网站乱码问题
// @author       Doris
// @license      MIT
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    const currentHost = window.location.hostname;

    // --- 数据加载 ---
    let globalFont = GM_getValue('globalFontData', '');
    let globalFontName = GM_getValue('globalFontName', 'GlobalFont');
    let siteFonts = GM_getValue('siteFonts', {}); // { hostname: { data, name } }
    let blacklist = GM_getValue('fontBlacklist', []);
    let isGlobalEnabled = GM_getValue('fontEnabled', true);

    // --- 判断当前站点状态 ---
    const isExcluded = blacklist.includes(currentHost);
    const hasSiteFont = siteFonts[currentHost];

    // --- 核心逻辑：应用字体 ---
    function applyFont() {
        const oldStyle = document.getElementById('doris-font-style');
        if (oldStyle) oldStyle.remove();

        // 如果全局关闭，或者当前站点在黑名单中，则不执行
        if (!isGlobalEnabled || isExcluded) return;

        // 确定要使用的字体 (优先使用站点独立字体)
        const activeFontData = hasSiteFont ? hasSiteFont.data : globalFont;
        const activeFontName = hasSiteFont ? hasSiteFont.name : globalFontName;

        if (!activeFontData) return;

        const style = document.createElement('style');
        style.id = 'doris-font-style';
        style.textContent = `
            @font-face {
                font-family: "${activeFontName}";
                src: url("${activeFontData}");
                font-display: swap;
            }
            /* 保护逻辑：排除图标、代码、画布等 */
            *:not(i):not([class*="icon"]):not([class*="Icon"]):not([class*="material"]):not([class*="symbols"]):not([class*="fa-"]):not(svg):not(canvas):not(code):not(pre) {
                font-family: "${activeFontName}", sans-serif !important;
            }
            /* Gemini 专用图标修正 */
            .material-symbols-outlined, .material-symbols-rounded, .material-symbols-sharp {
                font-family: 'Material Symbols Outlined' !important;
                font-style: normal !important;
            }
        `;
        document.documentElement.appendChild(style);
    }

    applyFont();

    // --- 注册油猴菜单 ---

    // 1. 全局开关
    GM_registerMenuCommand(isGlobalEnabled ? "🟢 全局功能：开启中" : "⚪ 全局功能：已关闭", () => {
        GM_setValue('fontEnabled', !isGlobalEnabled);
        location.reload();
    });

    // 2. 站点黑名单开关
    GM_registerMenuCommand(isExcluded ? "➕ 从黑名单移除此站" : "🚫 在此网站禁用字体", () => {
        let newList = [...blacklist];
        if (isExcluded) {
            newList = newList.filter(h => h !== currentHost);
        } else {
            newList.push(currentHost);
        }
        GM_setValue('fontBlacklist', newList);
        location.reload();
    });

    // 3. 站点独立字体上传
    GM_registerMenuCommand(hasSiteFont ? `🎨 更换此站专属字体 (${hasSiteFont.name})` : "🎯 为此网站设置独立字体", () => {
        showUploadModal(true);
    });

    // 4. 全局字体上传
    GM_registerMenuCommand("📤 设置全局默认字体", () => {
        showUploadModal(false);
    });

    // 5. 清除所有站点配置 (重置)
    GM_registerMenuCommand("🧹 清空所有站点独立设置", () => {
        if(confirm("确定要删除所有站点的特殊字体和黑名单吗？")) {
            GM_setValue('siteFonts', {});
            GM_setValue('fontBlacklist', []);
            location.reload();
        }
    });

    // --- UI 弹窗 ---
    function showUploadModal(isSiteSpecific) {
        if (document.getElementById('font-upload-modal')) return;

        const modal = document.createElement('div');
        modal.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:999999; font-family:sans-serif;";
        modal.id = 'font-upload-modal';

        modal.innerHTML = `
            <div style="background:#fff; padding:24px; border-radius:12px; width:340px; box-shadow:0 10px 30px rgba(0,0,0,0.3);">
                <h3 style="margin:0 0 10px 0;">${isSiteSpecific ? '设置站点专属字体' : '设置全局字体'}</h3>
                <p style="font-size:12px; color:#666; margin-bottom:15px;">当前站点: ${currentHost}</p>
                <input type="file" id="modal-font-input" accept=".ttf,.otf,.woff2" style="width:100%; margin-bottom:20px;">
                <div style="display:flex; gap:10px; justify-content:flex-end;">
                    <button id="modal-close" style="padding:8px 16px; border:1px solid #ccc; border-radius:6px; background:#fff; cursor:pointer;">取消</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('modal-close').onclick = () => modal.remove();

        document.getElementById('modal-font-input').onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const data = event.target.result;
                const name = file.name.split('.')[0];

                if (isSiteSpecific) {
                    let currentSiteFonts = GM_getValue('siteFonts', {});
                    currentSiteFonts[currentHost] = { data, name };
                    GM_setValue('siteFonts', currentSiteFonts);
                } else {
                    GM_setValue('globalFontData', data);
                    GM_setValue('globalFontName', name);
                }
                location.reload();
            };
            reader.readAsDataURL(file);
        };
    }

})();
