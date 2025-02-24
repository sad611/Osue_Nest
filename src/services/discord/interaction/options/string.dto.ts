import { StringOption } from 'necord';

export class MemberDto {
    @StringOption({
        name: 'member',
        description: 'Usuário para procurar (Undergrounds)',
        required: true
    })
    memberName: string;
}