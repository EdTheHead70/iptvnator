/** Trim imported display names without changing source text or EPG IDs. */
export function trimM3uChannelNames<T extends object>(item: T): T {
    const fields = item as { name?: unknown; tvg?: unknown };
    const rawTvg = fields.tvg;
    const rawTvgName =
        rawTvg && typeof rawTvg === 'object' && 'name' in rawTvg
            ? rawTvg.name
            : undefined;
    const name =
        typeof fields.name === 'string' ? fields.name.trim() : fields.name;
    const tvgName =
        typeof rawTvgName === 'string' ? rawTvgName.trim() : rawTvgName;
    const nameChanged = name !== fields.name;
    const tvgNameChanged = rawTvgName !== undefined && tvgName !== rawTvgName;
    if (!nameChanged && !tvgNameChanged) {
        return item;
    }
    return {
        ...item,
        ...(nameChanged ? { name } : {}),
        ...(tvgNameChanged && rawTvg && typeof rawTvg === 'object'
            ? { tvg: { ...rawTvg, name: tvgName } }
            : {}),
    } as T;
}
