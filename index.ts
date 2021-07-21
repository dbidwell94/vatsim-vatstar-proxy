import koa from 'koa';
import cors from '@koa/cors';
import axios from 'axios';
import Router from 'koa-router';

interface IFlightPlan {
  aircraft: string;
  aircraft_faa: string;
  aircraft_short: string;
  alternate: string;
  altitude: string;
  arrival: string;
  cruise_tas: string;
  departure: string;
  deptime: string;
  enroute_time: string;
  flight_rules: string;
  fuel_time: string;
  remarks: string;
  revision_id: number;
  route: string;
}

interface IPilot {
  altitude: number;
  callsign: string;
  cid: number;
  groundspeed: number;
  heading: number;
  /** Date as string */
  last_updated: string;
  latitude: number;
  /** Date as string */
  logon_time: string;
  longitude: number;
  name: string;
  pilot_rating: number;
  qnh_i_hg: number;
  qnh_mb: number;
  server: string;
  transponder: string;
  flight_plan: IFlightPlan;
}

let vatstimData = {
  atis: [],
  controllers: [],
  facilities: [],
  general: [],
  pilot_ratings: [],
  pilots: [] as IPilot[],
  prefiles: [],
  ratings: [],
  servers: [],
};

let vatstarPilotData: IPilot[] = [];

const router = new Router();

router.get('/', async (ctx, next) => {
  ctx.status = 200;
  ctx.body = vatstimData;
  await next();
});

router.get('/pilots', async (ctx) => {
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
    } else {
      ctx.res.write(`data: ${JSON.stringify(vatstimData.pilots)}\n\n`);
    }
  }

  writeToStream();

  const interval = setInterval(() => {
    writeToStream();
  }, 2500);

  return new Promise<void>((res) => {
    ctx.response.socket.on('close', () => {
      console.log('connection closed');
      clearInterval(interval);
      res();
    });
  });
});

const app = new koa();

app.use(
  cors({
    origin: '*',
  })
);

app.use(router.allowedMethods());
app.use(router.routes());

app.listen(process.env.PORT || 1437, () => {
  console.log(`listening on port ${process.env.PORT || 1437}`);

  setInterval(() => {
    axios
      .get('https://data.vatsim.net/v3/vatsim-data.json')
      .then((res) => {
        vatstimData = res.data;
        axios
          .get<{ username: string }[]>(
            'https://www.vatstar.com/index.php?option=com_nobosswebservice&service=cids&output=json&appKey=KPLMtYeJuiO3jwiS8EvIPc0YDRncXoHz'
          )
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
