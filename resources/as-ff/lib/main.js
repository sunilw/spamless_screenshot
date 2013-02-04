var self = require('self');
var tabs = require('tabs');
var pageMod = require('page-mod');
var ui = require('ui');
var upload = require('upload');
var ss = require("simple-storage");
var storage = ss.storage;
var data = self.data;
var captureData;
var hex_md5 = require('md5');
var {Cc, Ci, Cu} = require("chrome");
var notifications = require("notifications");
var mediator = Cc['@mozilla.org/appshell/window-mediator;1'].getService(Ci.nsIWindowMediator);
// edit
pageMod.PageMod({
    //the new jetpack version modify the jetpack resource page url
    include: 'resource://jid0-gxjllfbcoax0lcltedfrekqdqpi-at-jetpack/*',
    contentScriptWhen: 'ready',
    contentScriptFile: [data.url('js/content.js')],
    onAttach: function(worker) {
        worker.on('message', function(message) {
            switch(message.name) {
            case 'ready':
                captureData = ui.getCaptureData();
                captureData.type = 'visible';
                captureData.saveImageFormat = storage.options.format;
                worker.postMessage({name: 'ready', data: captureData});
                break;
            case'exit':
                tabs.activeTab.close();
                break;
            case 'signin':      // diigo
            case 'loadUserInfo':
            case 'uploadItems':
                upload.request(message, function(response) {
                    worker.postMessage({
                        name: message.name,
                        data: {status:response.status, text:response.text}
                    });
                });
                break;

            case 'saveCanvas':
                ui.saveCanvas(message.data);
                break;

            case 'login_by_google':
                function urlReady(tab) {
                    if (tab.url!='http://www.diigo.com/account/ffe_login_suc')
                        return;

                    worker.postMessage({
                        name: 'login_by_google',
                        data: {status: 200, text: null}
                    });
                    tabs.removeListener('ready', urlReady);
                    tab.close();
                    for (i in tabs) {
                        if (tabs[i].url === data.url('app.html')) {
                            return tabs[i].activate();
                        }
                    }
                }
                tabs.on('ready', urlReady);
                break;
            case 'login_by_diigo':
            case 'request_user_id':
            case 'load_user_info':
            case 'check_permission':
            case 'upload_to_diigo':
            case 'upload_to_as':
                upload.request(message, function(response) {
                    worker.postMessage({name: message.name,
                                        data: {status: response.status, text: response.text}
                                       });
                });
                break;
            }
        });
    }
});


if(!storage.userid){
    var u1 = Date.parse(new Date()) / 1000;
    var u2 = parseInt(Math.random()*10+1);
    var u3 = ''+u1+u2;
    var userid = hex_md5.hex_md5(u3);
    storage.userid = userid;
}

function initOptions() {
    storage.options = {
        format:'png',
        shortcuts:{
            "visible":{"enable":false,"key":"V"},
            "entire":{"enable":false,"key":"F"}
        },
        superfish:false
    };
}
function initCustomize() {
    storage.customize = {
        parent:'nav-bar',
        next:null
    };
}


if (!storage.options) initOptions();
if (!storage.customize) initCustomize();

ui.init();




