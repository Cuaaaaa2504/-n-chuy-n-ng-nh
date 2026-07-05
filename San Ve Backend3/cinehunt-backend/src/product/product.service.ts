import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../entities/product.entity';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product) private productRepo: Repository<Product>,
  ) {}

  findAll() {
    return this.productRepo.find({
      where: { status: 'ACTIVE' },
      order: { product_name: 'ASC' },
    });
  }

  async findById(id: number) {
    const product = await this.productRepo.findOne({
      where: { product_id: id },
    });
    if (!product) throw new NotFoundException(`Product #${id} không tồn tại`);
    return product;
  }

  async create(data: Partial<Product>) {
    const product = this.productRepo.create(data);
    return this.productRepo.save(product);
  }

  async update(id: number, data: Partial<Product>) {
    await this.findById(id);
    await this.productRepo.update(id, data);
    return this.findById(id);
  }

  async remove(id: number) {
    await this.findById(id);
    await this.productRepo.update(id, { status: 'INACTIVE' });
    return { message: `Product #${id} đã bị vô hiệu hóa` };
  }
}
