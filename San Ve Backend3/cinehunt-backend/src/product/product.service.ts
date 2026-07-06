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
      where: { status: 'ACTIVE' } as any,
      order: { productName: 'ASC' } as any,
    });
  }

  async findById(id: number): Promise<Product> {
    const product = await this.repo.findOne({ where: { productId: id } as any });
    if (!product) throw new NotFoundException(`Product #${id} không tồn tại`);
    return product;
  }

  // alias
  findOne(id: number): Promise<Product> {
    return this.findById(id);
  }

  create(data: Partial<Product>): Promise<Product> {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: number, data: Partial<Product>): Promise<Product> {
    await this.findById(id);
    await this.repo.update({ productId: id } as any, data);
    return this.findById(id);
  }

  async remove(id: number): Promise<void> {
    await this.findById(id);
    await this.repo.update({ productId: id } as any, { status: 'INACTIVE' } as any);
  }
}
