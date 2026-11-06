import { Prisma } from '@prisma/client'

/** Tables whose rows carry a 0-based "position" column. */
export type OrderedTable = 'tasks' | 'columns' | 'checklist_items'

type RawExecutor = Pick<Prisma.TransactionClient, '$executeRaw'>

/**
 * Writes position = index for every id in one statement, instead of one
 * UPDATE per sibling. `table` comes from a closed union, never from input.
 */
export async function writePositions(
  tx: RawExecutor,
  table: OrderedTable,
  orderedIds: readonly string[],
): Promise<void> {
  if (orderedIds.length === 0) return
  const positions = orderedIds.map((_, index) => index)
  await tx.$executeRaw`
    UPDATE ${Prisma.raw(`"${table}"`)} AS target
    SET "position" = ordered.position
    FROM unnest(${[...orderedIds]}::text[], ${positions}::int[]) AS ordered(id, position)
    WHERE target."id" = ordered.id`
}
