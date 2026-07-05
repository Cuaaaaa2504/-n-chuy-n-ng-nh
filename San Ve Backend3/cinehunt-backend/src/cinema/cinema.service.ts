import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cinema } from '../entities/cinema.entity';
import { Room } from '../entities/room.entity';

@Injectable()
export class CinemaService {
  constructor(
    @InjectRepository(Cinema) private cinemaRepo: Repository<Cinema>,
    @InjectRepository(Room) private roomRepo: Repository<Room>,
  ) {}

  findAllCinemas() {
    return this.cinemaRepo.find({ where: { status: 'ACTIVE' }, order: { cinema_name: 'ASC' } });
  }

  async findCinemaById(id: number) {
    const cinema = await this.cinemaRepo.findOne({ where: { cinema_id: id } });
    if (!cinema) throw new NotFoundException(`Cinema #${id} không tồn tại`);
    return cinema;
  }

  findRoomsByCinema(cinemaId: number) {
    return this.roomRepo.find({ where: { cinema_id: cinemaId, status: 'ACTIVE' } });
  }

  async createCinema(data: Partial<Cinema>) {
    const cinema = this.cinemaRepo.create(data);
    return this.cinemaRepo.save(cinema);
  }

  async updateCinema(id: number, data: Partial<Cinema>) {
    await this.findCinemaById(id);
    await this.cinemaRepo.update(id, data);
    return this.findCinemaById(id);
  }

  async deleteCinema(id: number) {
    await this.findCinemaById(id);
    await this.cinemaRepo.update(id, { status: 'INACTIVE' });
    return { message: `Cinema #${id} đã bị vô hiệu hóa` };
  }
}
