const feishuSecrets = require('./feishuConfig');

const config = {
    feishu: {
        FEISHU_HOST: "https://open.feishu.cn",
        APP_ACCESS_TOKEN_URI: "/open-apis/auth/v3/app_access_token/internal",
        USER_ACCESS_TOKEN_URI: "/open-apis/authen/v1/access_token",
        ...feishuSecrets
    }
};

module.exports = config; 