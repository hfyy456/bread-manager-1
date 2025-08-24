/*
 * @Author: Sirius 540363975@qq.com
 * @Date: 2025-08-25 02:47:08
 * @LastEditors: Sirius 540363975@qq.com
 * @LastEditTime: 2025-08-25 02:47:11
 */
/**
 * URL 参数工具函数
 * 提供兼容性的参数获取功能
 */

/**
 * 获取 URL 查询参数的通用函数
 * @param param 参数名
 * @returns 参数值或 null
 */
export const getQueryParam = (param: string): string | null => {
  return new URLSearchParams(window.location.search).get(param);
};

/**
 * 兼容获取飞书应用 ID 参数
 * 同时支持 appID 和 appId 两种参数名
 * @returns 应用 ID 或 null
 */
export const getFeishuAppId = (): string | null => {
  // 优先获取 appId（小写）
  const appId = getQueryParam('appId');
  if (appId) {
    return appId;
  }
  
  // 如果没有 appId，尝试获取 appID（大写）
  const appID = getQueryParam('appID');
  if (appID) {
    return appID;
  }
  
  return null;
};

/**
 * 兼容获取多个可能的参数名
 * @param paramNames 参数名数组，按优先级排序
 * @returns 第一个找到的参数值或 null
 */
export const getCompatibleParam = (paramNames: string[]): string | null => {
  for (const paramName of paramNames) {
    const value = getQueryParam(paramName);
    if (value) {
      return value;
    }
  }
  return null;
};

/**
 * 获取所有 URL 查询参数
 * @returns 参数对象
 */
export const getAllQueryParams = (): Record<string, string> => {
  const params: Record<string, string> = {};
  const urlParams = new URLSearchParams(window.location.search);
  
  for (const [key, value] of urlParams.entries()) {
    params[key] = value;
  }
  
  return params;
};