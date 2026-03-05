// ==UserScript==
// @name         智能网页字体管理器 (站点精控版)
// @namespace    http://tampermonkey.net/
// @version      1.4
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

// --- 核心优化：极致注入速度 ---
    function applyFont() {
        if (!isGlobalEnabled || isExcluded || !activeFontData) return;

        // 1. 将 swap 改为 block：
        // block 会在字体加载完成前隐藏文本（通常只有几十毫秒），避免视觉上的“跳动”
        const styleText = `
            @font-face {
                font-family: "${activeFontName}";
                src: url("${activeFontData}");
                font-display: block; 
            }
            /* 预先隐藏 body，防止系统字体闪现，加载完立即显示 */
            html { visibility: hidden; } 
            
            *:not(i):not([class*="icon"]):not([class*="Icon"]):not([class*="material"]):not([class*="symbols"]):not([class*="fa-"]):not(svg):not(canvas):not(code):not(pre) {
                font-family: "${activeFontName}", sans-serif !important;
            }
            
            .material-symbols-outlined { font-family: 'Material Symbols Outlined' !important; }
        `;

        const style = document.createElement('style');
        style.id = 'doris-font-style';
        style.textContent = styleText;

        // 2. 抢占式注入：不要等 head，直接塞进 html 根节点
        document.documentElement.appendChild(style);

        // 3. 强制显示：确保字体样式应用后立刻恢复网页可见
        const fastShow = `html { visibility: visible !important; }`;
        const showStyle = document.createElement('style');
        showStyle.textContent = fastShow;
        document.documentElement.appendChild(showStyle);
    }

    // 立即执行，不等任何事件
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
