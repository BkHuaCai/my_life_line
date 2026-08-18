import {
	createSSRApp
} from "vue";
import App from "./App.vue";

// Vue 渲染/组件错误：写入 _doc/jserr.log（window.onerror 捕获不到 Vue 内部错误）
function logJsError(tag, detail) {
	try {
		plus.io.resolveLocalFileSystemURL('_doc', (root) => {
			root.getFile('jserr.log', { create: true }, (fe) => {
				fe.createWriter((w) => {
					w.seek(w.length);
					w.write(`[${new Date().toISOString()}] ${tag}: ${String(detail)}\n`);
				}, () => {});
			}, () => {});
		});
	} catch (e) {}
}

export function createApp() {
	const app = createSSRApp(App);
	app.config.errorHandler = (err, instance, info) => {
		logJsError('vue.errorHandler', `${info || ''} | ${err && err.message ? err.message : String(err)}\n${err && err.stack ? err.stack.slice(0, 400) : ''}`);
	};
	return {
		app,
	};
}
