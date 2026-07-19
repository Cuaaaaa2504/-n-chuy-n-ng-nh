import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
    return this.cinemaRepo.find({
      where: { status: 'ACTIVE' },
      order: { cinemaName: 'ASC' },
    });
  }

  async findCinemaById(id: number) {
    const cinema = await this.cinemaRepo.findOne({ where: { cinemaId: id } });
    if (!cinema) throw new NotFoundException(`Cinema #${id} không tồn tại`);
    return cinema;
  }

  findRoomsByCinema(cinemaId: number) {
    return this.roomRepo.find({
      where: { cinemaId, status: 'ACTIVE' },
    });
  }

  async createCinema(data: Partial<Cinema>) {
    const cinema = this.cinemaRepo.create(data);
    return this.cinemaRepo.save(cinema);
  }

  async updateCinema(id: number, data: Partial<Cinema>) {
    await this.findCinemaById(id);
    await this.cinemaRepo.update({ cinemaId: id }, data);
    return this.findCinemaById(id);
  }

  async deleteCinema(id: number) {
    await this.findCinemaById(id);
    await this.cinemaRepo.update({ cinemaId: id }, { status: 'INACTIVE' });
    return { message: `Cinema #${id} đã bị vô hiệu hóa` };
  }

  // ── Rooms (phòng chiếu) ──────────────────────────────────────────────────
  // FIX: trước đây chỉ có GET /cinemas/:id/rooms, thiếu hoàn toàn CRUD phòng chiếu.

  /** Admin xem toàn bộ phòng của rạp (kể cả phòng INACTIVE) */
  async adminFindRoomsByCinema(cinemaId: number) {
    await this.findCinemaById(cinemaId);
    return this.roomRepo.find({
      where: { cinemaId },
      order: { roomName: 'ASC' },
    });
  }

  async findRoomById(cinemaId: number, roomId: number) {
    const room = await this.roomRepo.findOne({ where: { roomId } });
    if (!room) throw new NotFoundException(`Room #${roomId} không tồn tại`);
    if (room.cinemaId !== cinemaId) {
      throw new BadRequestException(
        `Room #${roomId} không thuộc rạp #${cinemaId}`,
      );
    }
    return room;
  }

  async createRoom(cinemaId: number, data: Partial<Room>) {
    await this.findCinemaById(cinemaId);
    const room = this.roomRepo.create({
      ...data,
      cinemaId,
      status: data.status ?? 'ACTIVE',
    });
    return this.roomRepo.save(room);
  }

  async updateRoom(cinemaId: number, roomId: number, data: Partial<Room>) {
    await this.findRoomById(cinemaId, roomId);
    // Không cho phép đổi phòng sang rạp khác qua endpoint này
    const { cinemaId: _ignored, roomId: _ignored2, ...patch } = data as any;
    await this.roomRepo.update({ roomId }, patch);
    return this.findRoomById(cinemaId, roomId);
  }

  /** Soft delete: phòng còn ràng buộc FK với showtimes/seats nên không xoá cứng */
  async deleteRoom(cinemaId: number, roomId: number) {
    await this.findRoomById(cinemaId, roomId);
    await this.roomRepo.update({ roomId }, { status: 'INACTIVE' });
    return { success: true, message: `Room #${roomId} đã bị vô hiệu hoá` };
  }
}
