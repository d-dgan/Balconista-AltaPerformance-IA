import { supabase } from './supabase';

declare global {
    interface Window {
        FB: any;
        fbAsyncInit: () => void;
    }
}

const APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID || '1252556112656504';

export const initFB = (): Promise<any> => {
    return new Promise((resolve) => {
        if (window.FB) {
            resolve(window.FB);
            return;
        }

        window.fbAsyncInit = function () {
            window.FB.init({
                appId: APP_ID,
                cookie: true,
                xfbml: true,
                version: 'v19.0'
            });
            resolve(window.FB);
        };

        (function (d: Document, s: string, id: string) {
            var js: any, fjs: any = d.getElementsByTagName(s)[0];
            if (d.getElementById(id)) return;
            js = d.createElement(s); js.id = id;
            js.src = "https://connect.facebook.net/en_US/sdk.js";
            fjs.parentNode.insertBefore(js, fjs);
        }(document, 'script', 'facebook-jssdk'));
    });
};

/**
 * Exchanges a short-lived user access token for a long-lived one (60 days).
 * LONG-TERM SECURITY: The secret is fetched from Supabase system_settings table,
 * which is protected by RLS (only admins can read).
 */
export const exchangeForLongLivedToken = async (shortLivedToken: string): Promise<string> => {
    try {
        // Fetch secret from Supabase instead of env
        const { data: secretData } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', 'meta_app_secret')
            .single();

        const appSecret = secretData?.value;

        if (!appSecret) {
            console.warn('Meta App Secret not found in system_settings. Tokens will be short-lived.');
            return shortLivedToken;
        }

        const response = await fetch(
            `https://graph.facebook.com/v19.0/oauth/access_token?` + 
            `grant_type=fb_exchange_token&` +
            `client_id=${APP_ID}&` +
            `client_secret=${appSecret}&` +
            `fb_exchange_token=${shortLivedToken}`
        );
        
        const data = await response.json();
        if (data.access_token) {
            return data.access_token;
        }
        throw new Error(data.error?.message || 'Failed to exchange token');
    } catch (error) {
        console.error('Error extending token:', error);
        return shortLivedToken;
    }
};

export const loginFB = (scopes: string = 'public_profile,email,instagram_basic,instagram_manage_messages,pages_messaging,pages_show_list,business_management'): Promise<any> => {
    return new Promise((resolve, reject) => {
        window.FB.login((response: any) => {
            if (response.authResponse) {
                // Call extend token without async in the callback itself to please the SDK
                exchangeForLongLivedToken(response.authResponse.accessToken).then(longLivedToken => {
                    resolve({
                        ...response.authResponse,
                        accessToken: longLivedToken
                    });
                }).catch(() => {
                    // Fallback to short-lived if extension fails
                    resolve(response.authResponse);
                });
            } else {
                reject(new Error('Login cancelado ou não autorizado.'));
            }
        }, { scope: scopes, return_scopes: true });
    });
};

export const getPages = (accessToken: string): Promise<any> => {
    return new Promise((resolve, reject) => {
        window.FB.api('/me/accounts', {
            fields: 'id,name,access_token,category,picture{url}',
            access_token: accessToken
        }, (response: any) => {
            if (response && !response.error) {
                resolve(response.data);
            } else {
                reject(response.error);
            }
        });
    });
};

export const getInstagramAccount = (pageId: string, accessToken: string): Promise<any> => {
    return new Promise((resolve, reject) => {
        window.FB.api(`/${pageId}`, {
            fields: 'instagram_business_account{id,username,name,profile_picture_url}',
            access_token: accessToken
        }, (response: any) => {
            if (response && !response.error) {
                resolve(response.instagram_business_account);
            } else {
                reject(response.error);
            }
        });
    });
};

export const subscribeAppToPage = (pageId: string, pageAccessToken: string): Promise<any> => {
    return new Promise((resolve, reject) => {
        window.FB.api(`/${pageId}/subscribed_apps`, 'POST', {
            subscribed_fields: 'messages,messaging_postbacks,messaging_optins,message_deliveries,message_reads,message_echoes,instagram_manage_messages',
            access_token: pageAccessToken
        }, (response: any) => {
            if (response && response.success) {
                resolve(response);
            } else {
                reject(response.error || new Error('Falha ao subscrever app na página.'));
            }
        });
    });
};
