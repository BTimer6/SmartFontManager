// ==UserScript==
// @name         智能字体管理器 (极致性能版)
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  支持全局/站点独立字体、站点黑名单，解决渲染延迟和图标乱码
// @author       Doris
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

    // --- 1. 数据加载与逻辑变量定义 ---
    let globalFont = GM_getValue('globalFontData', '');
    let globalFontName = GM_getValue('globalFontName', 'GlobalFont');
    let siteFonts = GM_getValue('siteFonts', {}); 
    let blacklist = GM_getValue('fontBlacklist', []);
    let isGlobalEnabled = GM_getValue('fontEnabled', true);

    const isExcluded = blacklist.includes(currentHost);
    const hasSiteFont = siteFonts[currentHost];
    
    // 关键修复：在这里定义变量，确保后面 applyFont 能用到
    const activeFontData = hasSiteFont ? hasSiteFont.data : globalFont;
    const activeFontName = hasSiteFont ? hasSiteFont.name : globalFontName;

    // --- 2. 极致性能注入逻辑 ---
    function applyFont() {
        // 如果全局关闭、在黑名单，或没有字体数据，直接退出
        if (!isGlobalEnabled || isExcluded || !activeFontData) return;

        const style = document.createElement('style');
        style.id = 'doris-font-style';
        style.textContent = `
            @font-face {
                font-family: "${activeFontName}";
                src: url("${activeFontData}");
                font-display: block; /* 核心优化：加载完前不显示旧字体 */
            }
            
            /* 预先隐藏页面，防止闪烁 */
            html { visibility: hidden; } 
            
            *:not(i):not([class*="icon"]):not([class*="Icon"]):not([class*="material"]):not([class*="symbols"]):not([class*="fa-"]):not(svg):not(canvas):not(code):not(pre) {
                font-family: "${activeFontName}", sans-serif !important;
            }
            
            /* Gemini 图标保护 */
            .material-symbols-outlined, .material-symbols-rounded, .material-symbols-sharp {
                font-family: 'Material Symbols Outlined' !important;
                font-style: normal !important;
            }
        `;
        
        // 抢占式注入到根节点
        document.documentElement.appendChild(style);

        // 字体应用后立即恢复显示
        const fastShow = document.createElement('style');
        fastShow.textContent = `html { visibility: visible !important; }`;
        document.documentElement.appendChild(fastShow);
    }

    // 立即执行
    applyFont();

    // --- 3. 油猴菜单管理 (逻辑同前) ---
    GM_registerMenuCommand(isGlobalEnabled ? "🟢 全局功能：开启" : "⚪ 全局功能：关闭", () => {
        GM_setValue('fontEnabled', !isGlobalEnabled);
        location.reload();
    });

    GM_registerMenuCommand(isExcluded ? "➕ 从黑名单移除" : "🚫 在此网站禁用", () => {
        let newList = [...blacklist];
        if (isExcluded) {
            newList = newList.filter(h => h !== currentHost);
        } else {
            newList.push(currentHost);
        }
        GM_setValue('fontBlacklist', newList);
        location.reload();
    });

    GM_registerMenuCommand("🎯 设置此站专属字体", () => showUploadModal(true));
    GM_registerMenuCommand("📤 设置全局默认字体", () => showUploadModal(false));
    GM_registerMenuCommand("🧹 重置所有站点设置", () => {
        if(confirm("确定要清空吗？")) {
            GM_setValue('siteFonts', {});
            GM_setValue('fontBlacklist', []);
            location.reload();
        }
    });

    // --- 4. 弹窗 UI 逻辑 ---
    function showUploadModal(isSiteSpecific) {
        if (document.getElementById('font-upload-modal')) return;
        const modal = document.createElement('div');
        modal.id = 'font-upload-modal';
        modal.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:999999; font-family:sans-serif;";
        modal.innerHTML = `
            <div style="background:#fff; padding:24px; border-radius:12px; width:340px; box-shadow:0 10px 30px rgba(0,0,0,0.3);">
                <h3 style="margin:0 0 10px 0;">${isSiteSpecific ? '专属字体' : '全局字体'}</h3>
                <input type="file" id="modal-font-input" accept=".ttf,.otf,.woff2" style="width:100%; margin-bottom:20px;">
                <button id="modal-close" style="padding:8px 16px; border:1px solid #ccc; border-radius:6px; background:#fff; cursor:pointer; float:right;">取消</button>
            </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('modal-close').onclick = () => modal.remove();
        document.getElementById('modal-font-input').onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (isSiteSpecific) {
                    let sFonts = GM_getValue('siteFonts', {});
                    sFonts[currentHost] = { data: ev.target.result, name: file.name.split('.')[0] };
                    GM_setValue('siteFonts', sFonts);
                } else {
                    GM_setValue('globalFontData', ev.target.result);
                    GM_setValue('globalFontName', file.name.split('.')[0]);
                }
                location.reload();
            };
            reader.readAsDataURL(file);
        };
    }
})();
