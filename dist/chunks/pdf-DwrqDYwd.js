import { n as e, r as t, t as n } from "./surface-CoI5lHPU.js";
//#region src/providers/pdf.ts
var r = class r {
	document;
	task;
	pageCount;
	disposed = !1;
	constructor(e, t) {
		this.document = e, this.task = t, this.pageCount = e.numPages;
	}
	static async open(e, t, i) {
		n(i);
		let a = await import("./pdf-ChUWQLon.js");
		n(i);
		let o = typeof e == "string" ? { url: e } : { data: e instanceof Blob ? new Uint8Array(await e.arrayBuffer()) : new Uint8Array(e) };
		n(i), a.GlobalWorkerOptions.workerSrc = new URL("pdf.worker.min.mjs", t).href;
		let s = a.getDocument({
			...o,
			cMapUrl: new URL("cmaps/", t).href,
			cMapPacked: !0,
			standardFontDataUrl: new URL("standard_fonts/", t).href,
			wasmUrl: new URL("wasm/", t).href
		}), c = () => {
			s.destroy();
		};
		i.addEventListener("abort", c, { once: !0 });
		try {
			let e = await s.promise;
			return n(i), new r(e, s);
		} catch (e) {
			s.destroy(), n(i);
			let t = e;
			throw t.name === "PasswordException" ? Error("This PDF requires a password. Password-protected documents are not supported.") : /worker|fetch.*module/i.test(t.message) ? Error("The PDF worker could not be loaded. Check assetBaseUrl and serve the matching worker assets.", { cause: e }) : Error(`PDF could not be opened. Check the file, URL and CORS headers. ${t.message}`, { cause: e });
		} finally {
			i.removeEventListener("abort", c);
		}
	}
	async size(e, t) {
		n(t);
		let r = await this.document.getPage(e);
		n(t);
		let i = r.getViewport({ scale: 1 });
		return {
			width: i.width,
			height: i.height
		};
	}
	async contents(e) {
		n(e);
		let t = await this.document.getOutline();
		n(e);
		let r = async (t, i = 0) => {
			if (i > 32) return [];
			let a = [];
			for (let o of t) {
				n(e);
				let t;
				try {
					let e = typeof o.dest == "string" ? await this.document.getDestination(o.dest) : o.dest;
					if (Array.isArray(e)) {
						let n = e[0], r = typeof n == "number" ? n : n && typeof n == "object" && "num" in n ? await this.document.getPageIndex(n) : -1;
						Number.isInteger(r) && r >= 0 && r < this.pageCount && (t = r + 1);
					}
				} catch {}
				n(e), a.push({
					title: o.title,
					page: t,
					children: await r(o.items ?? [], i + 1)
				});
			}
			return a;
		};
		return r(t ?? []);
	}
	async render(r, i, a) {
		n(a);
		let o = await this.document.getPage(r);
		n(a);
		let s = o.getViewport({ scale: 1 }), c = e(s, i), l = o.getViewport({ scale: c.width / s.width }), u = t(i), d = u.canvas.getContext("2d");
		d.fillStyle = "#fff", d.fillRect(0, 0, i.width, i.height);
		let f = o.render({
			canvasContext: d,
			canvas: u.canvas,
			viewport: l,
			transform: [
				1,
				0,
				0,
				1,
				c.x,
				c.y
			]
		}), p = () => f.cancel();
		a.addEventListener("abort", p, { once: !0 });
		try {
			return n(a), await f.promise, n(a), u;
		} catch (e) {
			throw u.dispose(), n(a), e;
		} finally {
			a.removeEventListener("abort", p), o.cleanup();
		}
	}
	dispose() {
		this.disposed || (this.disposed = !0, this.task.destroy());
	}
};
//#endregion
export { r as PDFProvider };
