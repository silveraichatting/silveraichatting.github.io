/**
 * MusicFloatWindow v2.1 - Bundle Ready
 * 
 * ESM:    import MusicFloatWindow from './MusicFloatWindow.js';
 * CJS:    const MusicFloatWindow = require('./MusicFloatWindow.js');
 * 
 * const fw = new MusicFloatWindow(options);
 * fw.show();   // 手动触发
 */

export default function MusicFloatWindow(options) {
    'use strict';

    // ─── 默认配置 ───────────────────────────────────
    var DEFAULTS = {
        iframeUrl : 'https://silveraichatting.github.io/music.html',
        floatImage: 'http://i0.hdslb.com/bfs/new_dyn/a5ac8841abeacc4416535227cf49e296401983045.jpg',
        title     : '喵洛神de小曲 · 三国杀皮肤主题曲',
        width     : 520,
        height    : 680,
        zIndex    : 99999,
        floatSize : 60,
        right     : '24px',
        bottom    : '24px'
    };

    var opts = Object.assign({}, DEFAULTS, options || {});
    var state = 'closed'; // closed | floating | open
    var els = {};
    var dragData = null;

    // ─── DOM 就绪检测 ───────────────────────────────
    function ready(fn) {
        if (document.readyState !== 'loading') {
            setTimeout(fn, 0);
        } else {
            document.addEventListener('DOMContentLoaded', fn, { once: true });
        }
    }

    // ─── 创建元素 ───────────────────────────────────
    function el(tag, className, html) {
        var d = document.createElement(tag);
        if (className) d.className = className;
        if (html != null) d.innerHTML = html;
        return d;
    }

    // ─── 初始化 ─────────────────────────────────────
    function init() {
        injectStyles();

        // 遮罩
        els.overlay = el('div', 'mfw-overlay');
        els.overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:' + opts.zIndex + ';display:none;opacity:0;transition:opacity .25s ease;';

        // 弹窗
        els.modal = el('div', 'mfw-modal');
        els.modal.style.cssText = [
            'position:fixed;z-index:' + (opts.zIndex + 1),
            'width:' + opts.width + 'px;height:' + opts.height + 'px',

            'border-radius:14px;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,.5)',
            'display:none;opacity:0;transition:opacity .25s ease',
            'background:#1a1a2e'
        ].join(';') + ';';

        // 标题栏
        var header = el('div', 'mfw-header', [
            '<span class="mfw-title" style="color:#fff;font-size:14px;font-weight:600;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + opts.title + '</span>',
            '<span class="mfw-min" style="color:#fff;font-size:18px;cursor:pointer;padding:0 4px;line-height:1;">&#8211;</span>',
            '<span class="mfw-close" style="color:#fff;font-size:18px;cursor:pointer;padding:0 4px;line-height:1;">&#10005;</span>'
        ].join(''));
        header.style.cssText = 'display:flex;align-items:center;padding:10px 14px;background:linear-gradient(135deg,#667eea,#764ba2);cursor:move;user-select:none;';

        // iframe（懒加载，先不设置 src）
        els.iframe = el('iframe');
        els.iframe.className = 'mfw-iframe';
        els.iframe.style.cssText = 'width:100%;height:calc(100% - 42px);border:none;display:block;';
        els.iframe.setAttribute('allow', 'autoplay;encrypted-media');

        els.modal.appendChild(header);
        els.modal.appendChild(els.iframe);

        // 悬浮窗
        els.floatBtn = el('div', 'mfw-float-btn');
        els.floatBtn.style.cssText = [
            'position:fixed;z-index:' + opts.zIndex,
            'width:' + opts.floatSize + 'px;height:' + opts.floatSize + 'px;border-radius:50%',
            'right:' + opts.right + ';bottom:' + opts.bottom,
            'cursor:pointer;display:none;opacity:0;transform:scale(0)',
            'transition:all .35s cubic-bezier(.34,1.56,.64,1)',
            'box-shadow:0 6px 24px rgba(102,126,234,.55);overflow:hidden'
        ].join(';') + ';';
        els.floatBtn.innerHTML = '<img src="' + opts.floatImage + '" style="width:100%;height:100%;object-fit:cover;">';

        // 悬浮菜单
        els.floatMenu = el('div', 'mfw-float-menu');
        els.floatMenu.style.cssText = 'position:fixed;z-index:' + (opts.zIndex + 1) + ';display:none;flex-direction:column;gap:6px;';
        els.floatMenu.innerHTML = [
            '<div class="mfw-restore" style="background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer;white-space:nowrap;">🎵 展开播放器</div>',
            '<div class="mfw-exit" style="background:rgba(255,255,255,.15);backdrop-filter:blur(10px);color:#fff;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer;white-space:nowrap;">✕ 关闭</div>'
        ].join('');

        document.body.appendChild(els.overlay);
        document.body.appendChild(els.modal);
        document.body.appendChild(els.floatBtn);
        document.body.appendChild(els.floatMenu);

        bindEvents(header);
        showFloat();
    }

    // ─── 样式注入 ───────────────────────────────────
    function injectStyles() {
        if (document.getElementById('mfw-styles')) return;
        var s = el('style');
        s.id = 'mfw-styles';
        s.textContent = [
            '.mfw-modal{resize:both;}',
            '@media(max-width:600px){.mfw-modal{width:96vw!important;height:82vh!important;}}',
            '.mfw-float-btn:hover{transform:scale(1.1)!important;}',
            '.mfw-float-btn::after{content:"";position:absolute;top:4px;right:4px;width:12px;height:12px;background:#ff4757;border-radius:50%;animation:pulse 2s infinite;}',
            '@keyframes pulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.5;transform:scale(1.3);}}'
        ].join('');
        document.head.appendChild(s);
    }

    // ─── 事件 ───────────────────────────────────────
    function bindEvents(header) {
        var iframeLoaded = false;

        // 最小化
        header.querySelector('.mfw-min').addEventListener('click', minimize);
        // 关闭
        header.querySelector('.mfw-close').addEventListener('click', close);
        // 遮罩
        els.overlay.addEventListener('click', minimize);
        // ESC
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && state === 'open') minimize();
        });

        // 悬浮窗单击 → 菜单
        els.floatBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            var rect = els.floatBtn.getBoundingClientRect();
            els.floatMenu.style.right = (window.innerWidth - rect.right) + 'px';
            els.floatMenu.style.bottom = (window.innerHeight - rect.top + 8) + 'px';
            els.floatMenu.style.display = 'flex';
        });
        document.addEventListener('click', function () { els.floatMenu.style.display = 'none'; });

        // 菜单：展开
        els.floatMenu.querySelector('.mfw-restore').addEventListener('click', function () {
            els.floatMenu.style.display = 'none';
            if (!iframeLoaded) {
                els.iframe.src = opts.iframeUrl;
                iframeLoaded = true;
            }
            els.floatBtn.style.opacity = '0';
            els.floatBtn.style.transform = 'scale(0)';
            setTimeout(function () {
                els.floatBtn.style.display = 'none';
                els.overlay.style.display = 'block';
                els.modal.style.display = 'block';
                requestAnimationFrame(function () {
                    els.overlay.style.opacity = '1';
                    els.modal.style.opacity = '1';
                });
            }, 200);
            state = 'open';
        });

        // 菜单：关闭
        els.floatMenu.querySelector('.mfw-exit').addEventListener('click', close);

        // 双击悬浮窗 → 直接展开
        els.floatBtn.addEventListener('dblclick', function () {
            els.floatMenu.style.display = 'none';
            if (!iframeLoaded) { els.iframe.src = opts.iframeUrl; iframeLoaded = true; }
            els.floatBtn.style.opacity = '0';
            els.floatBtn.style.transform = 'scale(0)';
            setTimeout(function () {
                els.floatBtn.style.display = 'none';
                els.overlay.style.display = 'block';
                els.modal.style.display = 'block';
                requestAnimationFrame(function () {
                    els.overlay.style.opacity = '1';
                    els.modal.style.opacity = '1';
                });
            }, 200);
            state = 'open';
        });

        // 拖拽
        makeDraggable(header, els.modal);
        makeDraggable(els.floatBtn, els.floatBtn);
    }

    // ─── 拖拽 ───────────────────────────────────────
    function makeDraggable(handle, target) {
        var sx, sy, ox, oy;
        handle.addEventListener('mousedown', start);
        handle.addEventListener('touchstart', start, { passive: false });
        function start(e) {
            if (e.target.classList.contains('mfw-min') || e.target.classList.contains('mfw-close')) return;
            e.preventDefault();
            var cx = e.clientX || e.touches[0].clientX;
            var cy = e.clientY || e.touches[0].clientY;
            sx = cx; sy = cy;
            var r = target.getBoundingClientRect();
            ox = r.left; oy = r.top;
            if (target === els.modal) {
                els.modal.style.left = ox + 'px';
                els.modal.style.top = oy + 'px';
            }
            document.addEventListener('mousemove', move);
            document.addEventListener('mouseup', end);
            document.addEventListener('touchmove', move, { passive: false });
            document.addEventListener('touchend', end);
        }
        function move(e) {
            e.preventDefault();
            var cx = e.clientX || (e.touches && e.touches[0].clientX);
            var cy = e.clientY || (e.touches && e.touches[0].clientY);
            target.style.left = (ox + cx - sx) + 'px';
            target.style.top = (oy + cy - sy) + 'px';
        }
        function end() {
            document.removeEventListener('mousemove', move);
            document.removeEventListener('mouseup', end);
            document.removeEventListener('touchmove', move);
            document.removeEventListener('touchend', end);
        }
    }

    // ─── 公开方法 ───────────────────────────────────
    function showFloat() {
        els.floatBtn.style.display = 'block';
        requestAnimationFrame(function () {
            els.floatBtn.style.opacity = '1';
            els.floatBtn.style.transform = 'scale(1)';
        });
        state = 'floating';
    }

    function minimize() {
        els.modal.style.opacity = '0';
        els.overlay.style.opacity = '0';
        setTimeout(function () {
            els.modal.style.display = 'none';
            els.overlay.style.display = 'none';
            showFloat();
        }, 250);
        state = 'floating';
    }

    function close() {
        els.modal.style.opacity = '0';
        els.overlay.style.opacity = '0';
        els.floatBtn.style.opacity = '0';
        els.floatBtn.style.transform = 'scale(0)';
        els.floatMenu.style.display = 'none';
        setTimeout(function () {
            els.modal.style.display = 'none';
            els.overlay.style.display = 'none';
            els.floatBtn.style.display = 'none';
            els.iframe.src = 'about:blank';
        }, 300);
        state = 'closed';
    }

    function destroy() {
        for (var k in els) {
            if (els[k] && els[k].parentNode) els[k].parentNode.removeChild(els[k]);
        }
        var s = document.getElementById('mfw-styles');
        if (s) s.remove();
        state = 'closed';
    }

    // ─── 启动 ───────────────────────────────────────
    ready(init);

    // ─── 返回 API ───────────────────────────────────
    return {
        show: showFloat,
        minimize: minimize,
        close: close,
        destroy: destroy,
        getState: function () { return state; }
    };
}
