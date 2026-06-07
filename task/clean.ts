import del from 'del'
import { Task } from 'task'

export default Task('clean', () => del('build'))
