/**
 * Weekly programme responses mix public and viewer-specific data on the same
 * URLs (for example, signed-in-only activities). They must never be stored by
 * a shared proxy or browser HTTP cache. The participant app keeps its own
 * explicit offline copy in localStorage instead.
 */
export const noStoreWeeklyData = (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Vary', 'Authorization, Cookie');
  next();
};

export default noStoreWeeklyData;
