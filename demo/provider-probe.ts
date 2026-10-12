import {openDocument} from '../src/providers';
import {RenderScheduler} from '../src/scheduler';
Object.assign(window,{documents:{openDocument,RenderScheduler}});
