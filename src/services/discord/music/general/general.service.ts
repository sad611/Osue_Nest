import { Injectable } from '@nestjs/common';

@Injectable()
export class GeneralService {


    msToTime(ms: number): string {
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    
        const formattedMinutes = minutes.toString().padStart(2, '0');
        const formattedSeconds = seconds.toString().padStart(2, '0');
    
        if (hours > 0) {
          const formattedHours = hours.toString().padStart(2, '0');
          return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
        }
        return `${formattedMinutes}:${formattedSeconds}`;
      }
}
