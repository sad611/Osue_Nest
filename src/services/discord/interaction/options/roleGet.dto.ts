import { StringOption } from 'necord';

export class RoleGetDto {
    @StringOption({
        name: 'nome',
        description: 'Nome da cor',
        required: true
    })
    roleName: string;
}