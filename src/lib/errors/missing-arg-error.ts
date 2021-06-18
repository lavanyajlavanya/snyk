import { CustomError } from './custom-error';

export class MissingArgError extends CustomError {
  constructor(command: string, required: string) {
    const msg = `The ${command} command can only be used if ${required} is specified.`;
    super(msg);
    this.code = 422;
    this.userMessage = msg;
  }
}
