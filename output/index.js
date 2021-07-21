"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const koa_1 = __importDefault(require("koa"));
const cors_1 = __importDefault(require("@koa/cors"));
const axios_1 = __importDefault(require("axios"));
const koa_router_1 = __importDefault(require("koa-router"));
let vatstimData = {
    atis: [],
    controllers: [],
    facilities: [],
    general: [],
    pilot_ratings: [],
    pilots: [],
    prefiles: [],
    ratings: [],
    servers: [],
};
let vatstarPilotData = [];
const router = new koa_router_1.default();
router.get('/', (ctx, next) => __awaiter(void 0, void 0, void 0, function* () {
    ctx.status = 200;
    ctx.body = vatstimData;
    yield next();
}));
router.get('/pilots', (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    ctx.request.socket.setTimeout(0);
    ctx.req.socket.setNoDelay(true);
    ctx.req.socket.setKeepAlive(true);
    const query = ctx.request.query;
    ctx.set({
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
        'connection': 'keep-alive',
    });
    ctx.status = 200;
    function writeToStream() {
        if (query['vatstar']) {
            ctx.res.write(`data: ${JSON.stringify(vatstarPilotData)}\n\n`);
        }
        else {
            ctx.res.write(`data: ${JSON.stringify(vatstimData.pilots)}\n\n`);
        }
    }
    writeToStream();
    const interval = setInterval(() => {
        writeToStream();
    }, 2500);
    return new Promise((res) => {
        ctx.response.socket.on('close', () => {
            console.log('connection closed');
            clearInterval(interval);
            res();
        });
    });
}));
const app = new koa_1.default();
app.use(cors_1.default({
    origin: '*',
}));
app.use(router.allowedMethods());
app.use(router.routes());
app.listen(1437, () => {
    console.log('listening on port 1437');
    setInterval(() => {
        axios_1.default
            .get('https://data.vatsim.net/v3/vatsim-data.json')
            .then((res) => {
            vatstimData = res.data;
            axios_1.default
                .get('https://www.vatstar.com/index.php?option=com_nobosswebservice&service=cids&output=json&appKey=KPLMtYeJuiO3jwiS8EvIPc0YDRncXoHz')
                .then((res) => {
                vatstarPilotData = [];
                // Check if the vatsim data includes pilots from vatstar
                vatstarPilotData = vatstimData.pilots.filter((pilot) => {
                    for (const vatstarPilotUsername of res.data) {
                        if (vatstarPilotUsername.username == pilot.cid.toString()) {
                            return true;
                        }
                    }
                    return false;
                });
            })
                .catch((err) => console.error(err.message));
        })
            .catch((err) => console.error(err.message));
    }, 15000);
});
