const motion = Object.freeze({
  duration: Object.freeze({
    instant: 90,
    fast: 120,
    normal: 160,
    medium: 220,
    slow: 300,
  }),
  stagger: Object.freeze({
    card: 32,
    list: 42,
  }),
  scale: Object.freeze({
    pressIn: 0.97,
    pressOut: 1,
  }),
  spring: Object.freeze({
    damping: 20,
    stiffness: 220,
  }),
});

export default motion;
