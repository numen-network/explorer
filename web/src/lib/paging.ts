export const PAGE_SIZES = [10, 20, 50, 100]

export interface Paging {
    page: number
    size: number
    offset: number
}

export function paging(sp: Record<string, string | string[] | undefined>): Paging {
    const page = Math.max(1, Number(sp.page) || 1)
    const wanted = Number(sp.size)
    const size = PAGE_SIZES.includes(wanted) ? wanted : 20
    return {page, size, offset: (page - 1) * size}
}
