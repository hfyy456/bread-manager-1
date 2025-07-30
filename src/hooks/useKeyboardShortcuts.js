import { useEffect, useCallback } from 'react';

/**
 * 键盘快捷键Hook
 * 为warehouse页面提供快捷键支持
 */
export const useKeyboardShortcuts = ({
  onSave,
  onRefresh,
  onReset,
  onSelectAll,
  onClearSelection,
  onToggleFilters,
  onExport,
  enabled = true
}) => {
  const handleKeyDown = useCallback((event) => {
    if (!enabled) return;

    // 检查是否在输入框中
    const isInputFocused = ['INPUT', 'TEXTAREA', 'SELECT'].includes(
      document.activeElement?.tagName
    );

    // 如果在输入框中，只处理特定快捷键
    if (isInputFocused && !event.ctrlKey && !event.metaKey) {
      return;
    }

    const { key, ctrlKey, metaKey, shiftKey, altKey } = event;
    const isCtrlOrCmd = ctrlKey || metaKey;

    // 定义快捷键映射
    const shortcuts = {
      // Ctrl/Cmd + S: 保存
      's': () => {
        if (isCtrlOrCmd && !shiftKey && !altKey) {
          event.preventDefault();
          onSave?.();
          return true;
        }
      },

      // Ctrl/Cmd + R: 刷新
      'r': () => {
        if (isCtrlOrCmd && !shiftKey && !altKey) {
          event.preventDefault();
          onRefresh?.();
          return true;
        }
      },

      // Ctrl/Cmd + Z: 重置
      'z': () => {
        if (isCtrlOrCmd && !shiftKey && !altKey) {
          event.preventDefault();
          onReset?.();
          return true;
        }
      },

      // Ctrl/Cmd + A: 全选
      'a': () => {
        if (isCtrlOrCmd && !shiftKey && !altKey && !isInputFocused) {
          event.preventDefault();
          onSelectAll?.();
          return true;
        }
      },

      // Escape: 清除选择
      'Escape': () => {
        if (!isCtrlOrCmd && !shiftKey && !altKey) {
          onClearSelection?.();
          return true;
        }
      },

      // Ctrl/Cmd + F: 切换过滤器
      'f': () => {
        if (isCtrlOrCmd && !shiftKey && !altKey) {
          event.preventDefault();
          onToggleFilters?.();
          return true;
        }
      },

      // Ctrl/Cmd + E: 导出
      'e': () => {
        if (isCtrlOrCmd && !shiftKey && !altKey) {
          event.preventDefault();
          onExport?.();
          return true;
        }
      },

      // F5: 刷新（浏览器默认，但我们可以自定义）
      'F5': () => {
        if (!isCtrlOrCmd && !shiftKey && !altKey) {
          event.preventDefault();
          onRefresh?.();
          return true;
        }
      }
    };

    // 执行对应的快捷键操作
    const handler = shortcuts[key];
    if (handler) {
      const handled = handler();
      if (handled) {
        // 显示快捷键提示
        showShortcutFeedback(key, isCtrlOrCmd, shiftKey, altKey);
      }
    }
  }, [
    enabled,
    onSave,
    onRefresh,
    onReset,
    onSelectAll,
    onClearSelection,
    onToggleFilters,
    onExport
  ]);

  // 显示快捷键反馈
  const showShortcutFeedback = useCallback((key, ctrl, shift, alt) => {
    const getKeyDisplayName = (key) => {
      const keyNames = {
        's': '保存',
        'r': '刷新',
        'z': '重置',
        'a': '全选',
        'Escape': '清除选择',
        'f': '切换过滤器',
        'e': '导出',
        'F5': '刷新'
      };
      return keyNames[key] || key;
    };

    const modifiers = [];
    if (ctrl) modifiers.push('Ctrl');
    if (shift) modifiers.push('Shift');
    if (alt) modifiers.push('Alt');

    const shortcutText = [...modifiers, key].join(' + ');
    const actionText = getKeyDisplayName(key);

    // 创建临时提示元素
    const feedback = document.createElement('div');
    feedback.textContent = `${actionText} (${shortcutText})`;
    feedback.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 14px;
      z-index: 10000;
      pointer-events: none;
      animation: fadeInOut 2s ease-in-out;
    `;

    // 添加CSS动画
    if (!document.getElementById('shortcut-feedback-styles')) {
      const style = document.createElement('style');
      style.id = 'shortcut-feedback-styles';
      style.textContent = `
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(-10px); }
          20% { opacity: 1; transform: translateY(0); }
          80% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-10px); }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(feedback);

    // 2秒后移除
    setTimeout(() => {
      if (feedback.parentNode) {
        feedback.parentNode.removeChild(feedback);
      }
    }, 2000);
  }, []);

  // 注册事件监听器
  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [enabled, handleKeyDown]);

  // 返回快捷键帮助信息
  const getShortcutHelp = useCallback(() => {
    return [
      { key: 'Ctrl + S', action: '保存所有更改' },
      { key: 'Ctrl + R / F5', action: '刷新数据' },
      { key: 'Ctrl + Z', action: '重置更改' },
      { key: 'Ctrl + A', action: '全选物料' },
      { key: 'Escape', action: '清除选择' },
      { key: 'Ctrl + F', action: '切换过滤器' },
      { key: 'Ctrl + E', action: '导出数据' }
    ];
  }, []);

  return {
    getShortcutHelp
  };
};

export default useKeyboardShortcuts;