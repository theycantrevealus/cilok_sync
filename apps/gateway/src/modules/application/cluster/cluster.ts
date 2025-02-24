import { Injectable } from '@nestjs/common';
import * as os from 'os';
import * as process from 'process';

const cluster = require('cluster');
const numCPUs = os.cpus().length;
const targetCluster = parseInt(process.env.NODE_CLUSTER) ?? numCPUs;

@Injectable()
export class SLCluster {
  static clusterize(callback): void {
    if (cluster.isMaster) {
      for (let i = 0; i < targetCluster; i++) {
        cluster.fork();
      }
      cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died. Restarting`);
        // TODO : Auto restart function
        cluster.fork();
      });
    } else {
      console.log(`Cluster server started on ${process.pid}`);
      callback();
    }
  }
}
