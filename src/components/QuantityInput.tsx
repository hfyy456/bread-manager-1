import React, { useState, useEffect } from 'react';
import {
  Box,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
} from '@mui/icons-material';

interface QuantityInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  size?: 'small' | 'medium';
  showLabel?: boolean;
  label?: string;
}

/**
 * 数量输入组件
 * 支持步进器和直接输入两种方式
 */
const QuantityInput: React.FC<QuantityInputProps> = ({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  disabled = false,
  size = 'small',
  showLabel = false,
  label = '数量',
}) => {
  const [inputValue, setInputValue] = useState<string>(value.toString());
  const [isFocused, setIsFocused] = useState<boolean>(false);

  // 当外部value变化时，更新内部inputValue
  useEffect(() => {
    if (!isFocused) {
      setInputValue(value.toString());
    }
  }, [value, isFocused]);

  /**
   * 处理步进器减少
   */
  const handleDecrease = () => {
    const newValue = Math.max(min, value - step);
    onChange(newValue);
  };

  /**
   * 处理步进器增加
   */
  const handleIncrease = () => {
    const newValue = Math.min(max, value + step);
    onChange(newValue);
  };

  /**
   * 处理直接输入
   */
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = event.target.value;
    
    // 允许空值和数字输入
    if (inputVal === '' || /^\d+$/.test(inputVal)) {
      setInputValue(inputVal);
    }
  };

  /**
   * 处理输入框失去焦点
   */
  const handleInputBlur = () => {
    setIsFocused(false);
    
    let numValue = parseInt(inputValue, 10);
    
    // 处理无效输入
    if (isNaN(numValue) || inputValue === '') {
      numValue = min;
    }
    
    // 确保值在范围内
    numValue = Math.max(min, Math.min(max, numValue));
    
    setInputValue(numValue.toString());
    onChange(numValue);
  };

  /**
   * 处理输入框获得焦点
   */
  const handleInputFocus = () => {
    setIsFocused(true);
  };

  /**
   * 处理回车键
   */
  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      (event.target as HTMLInputElement).blur();
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {showLabel && (
        <Typography variant="body2" sx={{ mr: 1 }}>
          {label}:
        </Typography>
      )}
      
      {/* 减少按钮 */}
      <IconButton
        size={size}
        onClick={handleDecrease}
        disabled={disabled || value <= min}
        sx={{ 
          minWidth: size === 'small' ? 32 : 40,
          width: size === 'small' ? 32 : 40,
          height: size === 'small' ? 32 : 40,
        }}
      >
        <RemoveIcon fontSize={size} />
      </IconButton>
      
      {/* 数量输入框 */}
      <TextField
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onFocus={handleInputFocus}
        onKeyPress={handleKeyPress}
        disabled={disabled}
        size={size}
        inputProps={{
          style: {
            textAlign: 'center',
            padding: size === 'small' ? '4px 8px' : '8px 12px',
          },
          inputMode: 'numeric',
          pattern: '[0-9]*',
        }}
        sx={{
          width: size === 'small' ? 60 : 80,
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: 'rgba(0, 0, 0, 0.23)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(0, 0, 0, 0.87)',
            },
            '&.Mui-focused fieldset': {
              borderColor: 'primary.main',
            },
          },
        }}
      />
      
      {/* 增加按钮 */}
      <IconButton
        size={size}
        onClick={handleIncrease}
        disabled={disabled || value >= max}
        sx={{ 
          minWidth: size === 'small' ? 32 : 40,
          width: size === 'small' ? 32 : 40,
          height: size === 'small' ? 32 : 40,
        }}
      >
        <AddIcon fontSize={size} />
      </IconButton>
    </Box>
  );
};

export default QuantityInput;