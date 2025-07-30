import React from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Alert, 
  Card, 
  CardContent,
  CardActions 
} from '@mui/material';
import { 
  ErrorOutline as ErrorIcon,
  Refresh as RefreshIcon,
  Home as HomeIcon 
} from '@mui/icons-material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo,
      hasError: true
    });

    // 记录错误到控制台
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // 可以在这里添加错误上报逻辑
    if (process.env.NODE_ENV === 'production') {
      // 上报错误到监控系统
      this.reportError(error, errorInfo);
    }
  }

  reportError = (error, errorInfo) => {
    // 错误上报逻辑
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    // 发送到错误监控服务
    console.log('Error reported:', errorData);
  };

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      const { error, retryCount } = this.state;
      const { fallback: Fallback } = this.props;

      // 如果提供了自定义fallback组件
      if (Fallback) {
        return <Fallback error={error} retry={this.handleRetry} />;
      }

      return (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '50vh',
          p: 3 
        }}>
          <Card sx={{ maxWidth: 600, width: '100%' }}>
            <CardContent sx={{ textAlign: 'center', p: 4 }}>
              <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
              
              <Typography variant="h5" gutterBottom color="error">
                页面出现错误
              </Typography>
              
              <Typography variant="body1" color="text.secondary" paragraph>
                抱歉，页面遇到了一个意外错误。请尝试刷新页面或返回首页。
              </Typography>

              {process.env.NODE_ENV === 'development' && error && (
                <Alert severity="error" sx={{ mt: 2, textAlign: 'left' }}>
                  <Typography variant="body2" component="pre" sx={{ 
                    whiteSpace: 'pre-wrap',
                    fontSize: '0.75rem',
                    maxHeight: 200,
                    overflow: 'auto'
                  }}>
                    {error.toString()}
                  </Typography>
                </Alert>
              )}

              {retryCount > 0 && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  重试次数: {retryCount}
                </Typography>
              )}
            </CardContent>
            
            <CardActions sx={{ justifyContent: 'center', pb: 3 }}>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={this.handleRetry}
                sx={{ mr: 1 }}
              >
                重试
              </Button>
              <Button
                variant="outlined"
                startIcon={<HomeIcon />}
                onClick={this.handleGoHome}
              >
                返回首页
              </Button>
            </CardActions>
          </Card>
        </Box>
      );
    }

    return this.props.children;
  }
}

// 函数式错误边界Hook (React 18+)
export const useErrorHandler = () => {
  const [error, setError] = React.useState(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error) => {
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { captureError, resetError };
};

export default ErrorBoundary;