/**
 * API响应标准化工具
 * 统一API响应格式，提高代码一致性
 */

class ResponseHelper {
  /**
   * 成功响应
   * @param {Object} res - Express响应对象
   * @param {*} data - 响应数据
   * @param {string} message - 成功消息
   * @param {number} statusCode - HTTP状态码
   */
  static success(res, data = null, message = '操作成功', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 错误响应
   * @param {Object} res - Express响应对象
   * @param {string} message - 错误消息
   * @param {number} statusCode - HTTP状态码
   * @param {*} details - 错误详情
   */
  static error(res, message = '操作失败', statusCode = 500, details = null) {
    const response = {
      success: false,
      message,
      timestamp: new Date().toISOString()
    };

    if (details && process.env.NODE_ENV === 'development') {
      response.details = details;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * 验证错误响应
   * @param {Object} res - Express响应对象
   * @param {Object} validationErrors - 验证错误对象
   */
  static validationError(res, validationErrors) {
    return res.status(400).json({
      success: false,
      message: '数据验证失败',
      errors: validationErrors,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 未找到资源响应
   * @param {Object} res - Express响应对象
   * @param {string} resource - 资源名称
   */
  static notFound(res, resource = '资源') {
    return res.status(404).json({
      success: false,
      message: `${resource}未找到`,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 未授权响应
   * @param {Object} res - Express响应对象
   * @param {string} message - 错误消息
   */
  static unauthorized(res, message = '未授权访问') {
    return res.status(401).json({
      success: false,
      message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 禁止访问响应
   * @param {Object} res - Express响应对象
   * @param {string} message - 错误消息
   */
  static forbidden(res, message = '禁止访问') {
    return res.status(403).json({
      success: false,
      message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 分页响应
   * @param {Object} res - Express响应对象
   * @param {Array} data - 数据数组
   * @param {Object} pagination - 分页信息
   * @param {string} message - 成功消息
   */
  static paginated(res, data, pagination, message = '获取数据成功') {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        total: pagination.total || 0,
        totalPages: Math.ceil((pagination.total || 0) / (pagination.limit || 10))
      },
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = ResponseHelper;