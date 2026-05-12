export function getInverseType(typeId: string, gender: 'MALE' | 'FEMALE' | null): string | null {
    const esFemale = gender === 'FEMALE';

    switch (typeId) {
        case 'padre':
        case 'madre':
            return esFemale ? 'hija' : 'hijo';

        case 'hijo':
        case 'hija':
            return esFemale ? 'madre' : 'padre';

        case 'hermano':
        case 'hermana':
            return esFemale ? 'hermana' : 'hermano';

        case 'tio':
        case 'tia':
            return esFemale ? 'sobrina' : 'sobrino';

        case 'sobrino':
        case 'sobrina':
            return esFemale ? 'tia' : 'tio';

        case 'abuelo':
        case 'abuela':
            return esFemale ? 'nieta' : 'nieto';

        case 'nieto':
        case 'nieta':
            return esFemale ? 'abuela' : 'abuelo';

        case 'primo':
        case 'prima':
            return esFemale ? 'prima' : 'primo';

        case 'conyuge':
            return 'conyuge';

        default:
            return null;
    }
}
