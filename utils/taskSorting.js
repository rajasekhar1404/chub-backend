const statusPriority = new Map([
    ['IN-PROGRESS', 0],
    ['TO-DO', 1],
    ['COMPLETED', 2],
    ['CANCELLED', 3]
])

const sortTasksByStatus = (tasks) => tasks.sort((first, second) => {
    const firstStatus = statusPriority.get(first.status || 'TO-DO') ?? statusPriority.size
    const secondStatus = statusPriority.get(second.status || 'TO-DO') ?? statusPriority.size
    return firstStatus - secondStatus
})

module.exports = { sortTasksByStatus }
