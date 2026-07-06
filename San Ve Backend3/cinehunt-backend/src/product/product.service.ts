import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../entities/product.entity';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
  ) {}

  findAll(): Promise<Product[]> {
    return this.repo.find({
      where: { status: 'ACTIVE' },
      order: { productName: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.repo.findOne({ where: { productId: id } });
    if (!product) throw new NotFoundException(`Product #${id} không tồn tại`);
    return product;
  }

  create(data: Partial<Product>): Promise<Product> {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: number, data: Partial<Product>): Promise<Product> {
    await this.findOne(id);
    await this.repo.update({ productId: id }, data);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.repo.update({ productId: id }, { status: 'INACTIVE' });
  }
}
