const needle = require("needle");
const config = require("../config/config");
const { User } = require("../models/User");



exports.authenticate = async (req, res) => {
    const { code, appID } = req.body;
    console.log("--- [Feishu Auth] Received Request ---");
    console.log(`- Auth Code: ${code}`);
    console.log(`- App ID: ${appID}`);

    if (!code || !appID) {
        return res.status(400).json({ message: '缺少授权码 (code) 或 App ID。' });
    }



    const appConfig = config.feishu[appID];
    if (!appConfig) {
        console.error(`[Feishu Auth Error] No configuration found for appID: ${appID}`);
        return res.status(400).json({ message: `未找到appID为 '${appID}' 的配置。` });
    }
    console.log("- Found matching app configuration.");

    try {
        // Step 1: Get app_access_token
        console.log("\n--- [Feishu Auth] Step 1: Getting App Access Token ---");
        const appTokenPayload = {
            app_id: appConfig.APP_ID,
            app_secret: appConfig.APP_SECRET,
        };
        console.log("- Request Payload:", appTokenPayload);

        const appTokenResponse = await needle(
            "post",
            config.feishu.FEISHU_HOST + config.feishu.APP_ACCESS_TOKEN_URI,
            appTokenPayload,
            { json: true }
        );

        console.log("- Feishu Response Body (App Token):", appTokenResponse.body);

        const appAccessToken = appTokenResponse.body.app_access_token;
        if (!appAccessToken) {
            console.error("[Feishu Auth Error] Failed to get app_access_token:", appTokenResponse.body);
            throw new Error(`获取应用凭证失败: ${appTokenResponse.body.msg || '未知错误'}`);
        }
        console.log("- Successfully obtained App Access Token.");

        // Step 2: Get user_access_token and user info
        console.log("\n--- [Feishu Auth] Step 2: Getting User Access Token ---");
        const userTokenPayload = {
            grant_type: "authorization_code",
            code: code,
        };
        const userTokenHeaders = {
            "Content-Type": "application/json",
            Authorization: "Bearer " + appAccessToken,
        };
        console.log("- Request Payload:", userTokenPayload);
        console.log("- Request Headers:", { ...userTokenHeaders, Authorization: "Bearer [REDACTED]" });


        const userTokenResponse = await needle(
            "post",
            config.feishu.FEISHU_HOST + config.feishu.USER_ACCESS_TOKEN_URI,
            userTokenPayload,
            {
                headers: userTokenHeaders,
                json: true
            }
        );
        
        console.log("- Feishu Response Body (User Token):", userTokenResponse.body);

        const userData = userTokenResponse.body.data;
        if (!userData || !userData.access_token) {
            console.error("[Feishu Auth Error] Failed to get user access token:", userTokenResponse.body);
            throw new Error(`获取用户凭证失败: ${userTokenResponse.body.msg || '未知错误'}`);
        }
        
        // Step 3: Get user profile information
        console.log("\n--- [Feishu Auth] Step 3: Getting User Profile ---");
        const userProfileHeaders = {
            "Content-Type": "application/json",
            Authorization: "Bearer " + userData.access_token,
        };
        
        const userProfileResponse = await needle(
            "get",
            config.feishu.FEISHU_HOST + "/open-apis/authen/v1/user_info",
            {
                headers: userProfileHeaders,
                json: true
            }
        );
        
        console.log("- User Profile Response:", userProfileResponse.body);
        
        if (!userProfileResponse.body.data) {
            console.error("[Feishu Auth Error] Failed to get user profile:", userProfileResponse.body);
            throw new Error(`获取用户信息失败: ${userProfileResponse.body.msg || '未知错误'}`);
        }
        
        const userProfile = userProfileResponse.body.data;
        console.log("- Raw userProfile from Feishu:", userProfile);
        
        // Step 4: Create or update user in database
        console.log("\n--- [Feishu Auth] Step 4: User Registration/Login ---");
        
        // Validate that we have a valid open_id (Feishu uses open_id as user identifier)
        if (!userProfile.open_id) {
            console.error("[Feishu Auth Error] No open_id in userProfile:", userProfile);
            throw new Error('飞书用户信息中缺少用户ID');
        }
        
        const feishuUserData = {
            feishuUserId: userProfile.open_id,
            name: userProfile.name,
            email: userProfile.email,
            avatar: userProfile.avatar_url
        };
        
        console.log("- Processing user data:", feishuUserData);
        console.log("- feishuUserId value:", feishuUserData.feishuUserId);
        console.log("- feishuUserId type:", typeof feishuUserData.feishuUserId);
        
        const { user, isNewUser } = await User.findOrCreateByFeishuId(feishuUserData);
        
        if (isNewUser) {
            console.log(`- New user registered: ${user.name} (${user.feishuUserId})`);
        } else {
            console.log(`- Existing user logged in: ${user.name} (${user.feishuUserId})`);
        }
        
        console.log("\n--- [Feishu Auth] Success ---");
        console.log("- Final user object:", {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isNewUser
        });
        
        // 返回用户信息（包含数据库中的用户数据）
        res.json({
            userId: user.feishuUserId,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            role: user.role,
            storeId: user.storeId,
            isNewUser,
            access_token: userData.access_token, // 保留飞书访问令牌
            ...userData // 保留其他飞书返回的数据
        });

    } catch (error) {
        console.error("--- [Feishu Auth] Fatal Error ---", error.message);
        res.status(500).json({ message: "飞书认证失败", details: error.message });
    }
};