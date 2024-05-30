import { StringOption } from 'necord';

export class RoleSetDto {
    @StringOption({
        name: 'nome',
        description: 'Nome da cor',
        required: true
    })
    roleName: string;
     @StringOption({
        name: 'hex',
        description: 'Código hex',
        required: true
    })
    colorHex: string;
}