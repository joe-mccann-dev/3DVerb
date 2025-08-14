// aiming for ~60 FPS. 1000 ms / 60 fps = 16.67
export const THROTTLE_TIME = 16.67;
export const SLOW_THROTTLE_TIME = THROTTLE_TIME * 2;
export const DEBOUNCE_TIME = SLOW_THROTTLE_TIME;
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