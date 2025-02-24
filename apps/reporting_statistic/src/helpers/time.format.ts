export function convertTime(time) {
  return time.replace(/T/, ' ').replace(/\..+/, '').split(' ', 1)[0];
}
