const isPropertyNotEmpty = (value, propertyName) => {
    if (!value || value.trim().length <= 0) {
        throw new Error(propertyName + ' should not be empty.')
    }
    return value.trim();
}

const isPropertyExists = (value) => {
    if (value) {
        return value.trim()
    }
    return false
}

module.exports = {
    isPropertyNotEmpty,
    isPropertyExists
}