export const parseNonNegativeInt = (value, fallback, {max = 1000} = {}) => {
  const parsed = Number.parseInt(value, 10);
  return !Number.isFinite(parsed) || parsed < 0 ? fallback : Math.min(parsed, max);
};

export const parseQuery = (searchParams) => {
  const query = {};
  for (const [key, value] of searchParams.entries()) {
    if (key === 'class' || key === 'age' || key === 'depth' || key === 'prerequisiteDepth' || key === 'limit' || key === 'offset') {
      query[key] = Number.parseInt(value, 10);
    } else if (key === 'codesOnly') {
      query[key] = value === 'true' ? true : value === 'false' ? false : value;
    } else {
      query[key] = value;
    }
  }
  return query;
};

export const paginate = (rows, query, {defaultLimit = 100, maxLimit = 500} = {}) => {
  const offset = parseNonNegativeInt(query.offset, 0);
  const limit = parseNonNegativeInt(query.limit, defaultLimit, {max: maxLimit});
  return {
    offset,
    limit,
    rows: rows.slice(offset, offset + limit),
  };
};
