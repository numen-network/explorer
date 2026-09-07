'use client'

import {Fragment, type ReactNode} from 'react'
import {createColumnHelper, rowExpandingFeature, tableFeatures, useTable, type ColumnDef, type Row, type RowData} from '@tanstack/react-table'
import {ChevronRight} from 'lucide-react'
import {cn} from 'cn'
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table'

// className sizes or hides a column and reaches the heading and the cells
// alike, cellClassName reaches the cells alone
export interface ColumnMeta {
    align?: 'right'
    className?: string
    cellClassName?: string
}

export const features = tableFeatures({rowExpandingFeature, columnMeta: {} as ColumnMeta})
export type Features = typeof features

export const columnsFor = <T extends RowData>() => createColumnHelper<Features, T>()

export type Columns<T extends RowData> = ColumnDef<Features, T, any>[]

// the whole row is clickable, the chevron is what shows it and gives
// keyboard users a tab stop
export function expander<T extends RowData>(helper: ReturnType<typeof columnsFor<T>>, boxed = false) {
    return helper.display({
        id: 'expand',
        meta: boxed ? {className: 'min-w-12 pr-0', cellClassName: 'text-muted-foreground'} : {className: 'min-w-10 px-0', cellClassName: 'text-dim'},
        cell: ({row}) =>
            row.getCanExpand() ? (
                <button type="button" aria-label="expand" aria-expanded={row.getIsExpanded()} className={cn('grid place-items-center', boxed && 'size-6 rounded-md border')}>
                    <ChevronRight className={cn('size-3.5 transition-transform', row.getIsExpanded() && 'rotate-90')} />
                </button>
            ) : null,
    })
}

interface Props<T extends RowData> {
    columns: Columns<T>
    rows: T[]
    empty?: ReactNode
    emptyClassName?: string
    head?: boolean
    headClassName?: string
    getRowId?: (row: T) => string
    canExpand?: (row: T) => boolean
    expand?: (row: T) => ReactNode
    className?: string
}

const headClass = (meta: ColumnMeta | undefined, extra?: string) => cn(meta?.align === 'right' && 'text-right', meta?.className, extra)
const cellClass = (meta: ColumnMeta | undefined) => cn(meta?.align === 'right' && 'text-right', meta?.className, meta?.cellClassName)

// sorting and paging stay in the url, so the table only ever holds the page
// it was handed and registers no feature that could reorder it
export function DataTable<T extends RowData>({columns, rows, empty = 'None', emptyClassName = 'py-6', head = true, headClassName, getRowId, canExpand, expand, className}: Props<T>) {
    const table = useTable({
        features,
        data: rows,
        columns,
        getRowId,
        getRowCanExpand: (row: Row<Features, T>) => canExpand?.(row.original) ?? false,
    })
    const width = table.getAllLeafColumns().length
    return (
        <Table className={cn('whitespace-nowrap', className)}>
            {head && (
                <TableHeader>
                    {table.getHeaderGroups().map(group => (
                        <TableRow key={group.id} className="hover:bg-transparent">
                            {group.headers.map(header => (
                                <TableHead key={header.id} colSpan={header.colSpan} className={headClass(header.column.columnDef.meta, headClassName)}>
                                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                                </TableHead>
                            ))}
                        </TableRow>
                    ))}
                </TableHeader>
            )}
            <TableBody>
                {rows.length === 0 && (
                    <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={width} className={cn('text-muted-foreground', emptyClassName)}>
                            {empty}
                        </TableCell>
                    </TableRow>
                )}
                {table.getRowModel().rows.map(row => (
                    <Fragment key={row.id}>
                        <TableRow onClick={row.getCanExpand() ? row.getToggleExpandedHandler() : undefined} className={cn(row.getCanExpand() && 'cursor-pointer')}>
                            {row.getAllCells().map(cell => (
                                <TableCell key={cell.id} className={cellClass(cell.column.columnDef.meta)}>
                                    <table.FlexRender cell={cell} />
                                </TableCell>
                            ))}
                        </TableRow>
                        {row.getIsExpanded() && (
                            <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={width} className="p-0 whitespace-normal first:pl-0 last:pr-0">
                                    {expand?.(row.original)}
                                </TableCell>
                            </TableRow>
                        )}
                    </Fragment>
                ))}
            </TableBody>
        </Table>
    )
}
