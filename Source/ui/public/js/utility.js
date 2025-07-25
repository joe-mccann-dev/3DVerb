// aiming for ~30 FPS. 1000 ms / 30 fps = 33.3333
export const THROTTLE_TIME = 33;
export const SLOW_THROTTLE_TIME = THROTTLE_TIME * 3;
export const DEFAULT_STEP_VALUE = 0.01;

export function getLinearScaledValue(minValue, maxValue, paramValue) {
    return minValue + (maxValue - minValue) * paramValue;
}

export function getLogScaledValue(minValue, maxValue, paramValue, logBase) {
    const logScale = Math.log(paramValue + 1) / Math.log(logBase);
    return minValue + (maxValue - minValue) * logScale;
}

//https://www.freecodecamp.org/news/throttling-in-javascript/
export function throttle(func, delay) {
    let timeout = null;
    return (...args) => {
        if (!timeout) {
            func(...args);
            timeout = setTimeout(() => {
                timeout = null;
            }, delay);
        }
    }
}

export function debounce(func, timeout = THROTTLE_TIME) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
}