import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
    httpDebug: 'full',
}

export default function () {
  http.get(`${__ENV.TEST_URL}`);
  sleep(1);
}
