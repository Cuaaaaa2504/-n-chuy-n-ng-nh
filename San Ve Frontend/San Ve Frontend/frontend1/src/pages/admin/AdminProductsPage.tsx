// src/pages/admin/AdminProductsPage.tsx
// Quản lý sản phẩm bắp nước (products) và combo (concession-combos)
import { useCallback, useEffect, useState } from 'react';
import { comboApi, productApi } from '../../api/adminApi';
import type { ConcessionCombo, Product } from '../../types/admin';
import { Btn, ConfirmModal, EmptyState, ErrorBanner, Field, Loading, Modal, PageHeader, Pill, TableShell, Td, Th, Toast } from '../../components/admin/AdminUI';
import { formatVnd, inputClass, useToast } from '../../components/admin/adminUiHelpers';

type Tab = 'products' | 'combos';

interface ProductForm {
  productName: string;
  price: number;
  unit: string;
  imageUrl: string;
  status: 'ACTIVE' | 'INACTIVE';
}

interface ComboForm {
  comboName: string;
  price: number;
  description: string;
  imageUrl: string;
  status: 'ACTIVE' | 'INACTIVE';
}

const emptyProduct: ProductForm = {
  productName: '',
  price: 0,
  unit: 'Cái',
  imageUrl: '',
  status: 'ACTIVE',
};

const emptyCombo: ComboForm = {
  comboName: '',
  price: 0,
  description: '',
  imageUrl: '',
  status: 'ACTIVE',
};

export default function AdminProductsPage() {
  const [tab, setTab] = useState<Tab>('products');

  const [products, setProducts] = useState<Product[]>([]);
  const [combos, setCombos] = useState<ConcessionCombo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast, showToast } = useToast();

  // Modal sản phẩm
  const [productModal, setProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<ProductForm>(emptyProduct);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);

  // Modal combo
  const [comboModal, setComboModal] = useState(false);
  const [editingCombo, setEditingCombo] = useState<ConcessionCombo | null>(null);
  const [comboForm, setComboForm] = useState<ComboForm>(emptyCombo);
  const [deleteCombo, setDeleteCombo] = useState<ConcessionCombo | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, c] = await Promise.all([productApi.getAll(), comboApi.getAll()]);
      setProducts(Array.isArray(p) ? p : []);
      setCombos(Array.isArray(c) ? c : []);
    } catch (err) {
      setError((err as { message?: string })?.message ?? 'Không tải được dữ liệu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Tải dữ liệu lần đầu khi mount. Rule react-hooks/set-state-in-effect
    // báo vì fetchData() gọi setLoading(true) đồng bộ ở đầu hàm; đây là
    // pattern fetch-on-mount hợp lệ nên tắt rule tại đúng dòng này.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchData();
  }, [fetchData]);

  // ── Sản phẩm ─────────────────────────────────────────────────────────────
  const openCreateProduct = () => {
    setEditingProduct(null);
    setProductForm(emptyProduct);
    setProductModal(true);
  };

  const openEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProductForm({
      productName: p.productName,
      price: Number(p.price ?? 0),
      unit: p.unit ?? '',
      imageUrl: p.imageUrl ?? '',
      status: p.status ?? 'ACTIVE',
    });
    setProductModal(true);
  };

  const submitProduct = async () => {
    if (!productForm.productName.trim()) {
      showToast('Vui lòng nhập tên sản phẩm', 'error');
      return;
    }
    try {
      const payload = {
        productName: productForm.productName.trim(),
        price: Number(productForm.price),
        unit: productForm.unit || undefined,
        imageUrl: productForm.imageUrl || undefined,
        status: productForm.status,
      };
      if (editingProduct) {
        await productApi.update(editingProduct.productId, payload);
        showToast('Đã cập nhật sản phẩm', 'success');
      } else {
        await productApi.create(payload);
        showToast('Đã thêm sản phẩm', 'success');
      }
      setProductModal(false);
      await fetchData();
    } catch (err) {
      showToast((err as { message?: string })?.message ?? 'Lưu sản phẩm thất bại', 'error');
    }
  };

  const confirmDeleteProduct = async () => {
    if (!deleteProduct) return;
    try {
      await productApi.remove(deleteProduct.productId);
      showToast('Đã xoá sản phẩm', 'success');
      setDeleteProduct(null);
      await fetchData();
    } catch (err) {
      showToast((err as { message?: string })?.message ?? 'Xoá thất bại', 'error');
      setDeleteProduct(null);
    }
  };

  // ── Combo ────────────────────────────────────────────────────────────────
  const openCreateCombo = () => {
    setEditingCombo(null);
    setComboForm(emptyCombo);
    setComboModal(true);
  };

  const openEditCombo = (c: ConcessionCombo) => {
    setEditingCombo(c);
    setComboForm({
      comboName: c.comboName,
      price: Number(c.price ?? 0),
      description: c.description ?? '',
      imageUrl: c.imageUrl ?? '',
      status: c.status ?? 'ACTIVE',
    });
    setComboModal(true);
  };

  const submitCombo = async () => {
    if (!comboForm.comboName.trim()) {
      showToast('Vui lòng nhập tên combo', 'error');
      return;
    }
    try {
      const payload = {
        comboName: comboForm.comboName.trim(),
        price: Number(comboForm.price),
        description: comboForm.description || undefined,
        imageUrl: comboForm.imageUrl || undefined,
        status: comboForm.status,
      };
      if (editingCombo) {
        await comboApi.update(editingCombo.comboId, payload);
        showToast('Đã cập nhật combo', 'success');
      } else {
        await comboApi.create(payload);
        showToast('Đã thêm combo', 'success');
      }
      setComboModal(false);
      await fetchData();
    } catch (err) {
      showToast((err as { message?: string })?.message ?? 'Lưu combo thất bại', 'error');
    }
  };

  const confirmDeleteCombo = async () => {
    if (!deleteCombo) return;
    try {
      await comboApi.remove(deleteCombo.comboId);
      showToast('Đã xoá combo', 'success');
      setDeleteCombo(null);
      await fetchData();
    } catch (err) {
      showToast((err as { message?: string })?.message ?? 'Xoá thất bại', 'error');
      setDeleteCombo(null);
    }
  };

  return (
    <div>
      <Toast toast={toast} />
      <PageHeader
        title="Sản phẩm & Combo"
        subtitle="Quản lý bắp nước và các combo bán kèm"
        actions={
          <Btn
            variant="primary"
            onClick={tab === 'products' ? openCreateProduct : openCreateCombo}
          >
            + {tab === 'products' ? 'Thêm sản phẩm' : 'Thêm combo'}
          </Btn>
        }
      />

      {/* Tab chuyển đổi */}
      <div className="flex gap-2 mb-5">
        <Btn
          variant={tab === 'products' ? 'primary' : 'ghost'}
          onClick={() => setTab('products')}
        >
          🍿 Sản phẩm ({products.length})
        </Btn>
        <Btn variant={tab === 'combos' ? 'primary' : 'ghost'} onClick={() => setTab('combos')}>
          🎁 Combo ({combos.length})
        </Btn>
      </div>

      <ErrorBanner message={error} />

      {loading ? (
        <Loading />
      ) : tab === 'products' ? (
        products.length === 0 ? (
          <EmptyState icon="🍿" label="Chưa có sản phẩm nào" />
        ) : (
          <TableShell>
            <table className="w-full text-sm">
            <thead>
              <tr>
                <Th>#</Th>
                <Th>Tên sản phẩm</Th>
                <Th>Đơn vị</Th>
                <Th>Giá</Th>
                <Th>Trạng thái</Th>
                <Th>Thao tác</Th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.productId} className="border-t border-gray-800 hover:bg-gray-800/40">
                  <Td>{p.productId}</Td>
                  <Td className="font-semibold text-white">{p.productName}</Td>
                  <Td>{p.unit ?? '—'}</Td>
                  <Td>{formatVnd(p.price)}</Td>
                  <Td>
                    <Pill color={p.status === 'ACTIVE' ? 'green' : 'gray'}>
                      {p.status === 'ACTIVE' ? 'Đang bán' : 'Ngừng bán'}
                    </Pill>
                  </Td>
                  <Td>
                    <div className="flex gap-2">
                      <Btn onClick={() => openEditProduct(p)}>Sửa</Btn>
                      <Btn variant="danger" onClick={() => setDeleteProduct(p)}>
                        Xoá
                      </Btn>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
            </table>
          </TableShell>
        )
      ) : combos.length === 0 ? (
        <EmptyState icon="🎁" label="Chưa có combo nào" />
      ) : (
        <TableShell>
          <table className="w-full text-sm">
          <thead>
            <tr>
              <Th>#</Th>
              <Th>Tên combo</Th>
              <Th>Mô tả</Th>
              <Th>Giá</Th>
              <Th>Trạng thái</Th>
              <Th>Thao tác</Th>
            </tr>
          </thead>
          <tbody>
            {combos.map((c) => (
              <tr key={c.comboId} className="border-t border-gray-800 hover:bg-gray-800/40">
                <Td>{c.comboId}</Td>
                <Td className="font-semibold text-white">{c.comboName}</Td>
                <Td className="max-w-xs truncate">{c.description ?? '—'}</Td>
                <Td>{formatVnd(c.price)}</Td>
                <Td>
                  <Pill color={c.status === 'ACTIVE' ? 'green' : 'gray'}>
                    {c.status === 'ACTIVE' ? 'Đang bán' : 'Ngừng bán'}
                  </Pill>
                </Td>
                <Td>
                  <div className="flex gap-2">
                    <Btn onClick={() => openEditCombo(c)}>Sửa</Btn>
                    <Btn variant="danger" onClick={() => setDeleteCombo(c)}>
                      Xoá
                    </Btn>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
          </table>
        </TableShell>
      )}

      {/* Modal sản phẩm */}
      {productModal && (
        <Modal
          title={editingProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
          onClose={() => setProductModal(false)}
          footer={
            <>
              <Btn onClick={() => setProductModal(false)}>Huỷ</Btn>
              <Btn variant="primary" onClick={() => void submitProduct()}>
                Lưu
              </Btn>
            </>
          }
        >
          <Field label="Tên sản phẩm">
            <input
              className={inputClass}
              value={productForm.productName}
              onChange={(e) => setProductForm({ ...productForm, productName: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Giá (VNĐ)">
              <input
                type="number"
                className={inputClass}
                value={productForm.price}
                onChange={(e) =>
                  setProductForm({ ...productForm, price: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Đơn vị">
              <input
                className={inputClass}
                value={productForm.unit}
                onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Ảnh (URL)">
            <input
              className={inputClass}
              value={productForm.imageUrl}
              onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
            />
          </Field>
          <Field label="Trạng thái">
            <select
              className={inputClass}
              value={productForm.status}
              onChange={(e) =>
                setProductForm({
                  ...productForm,
                  status: e.target.value as 'ACTIVE' | 'INACTIVE',
                })
              }
            >
              <option value="ACTIVE">Đang bán</option>
              <option value="INACTIVE">Ngừng bán</option>
            </select>
          </Field>
        </Modal>
      )}

      {/* Modal combo */}
      {comboModal && (
        <Modal
          title={editingCombo ? 'Sửa combo' : 'Thêm combo'}
          onClose={() => setComboModal(false)}
          footer={
            <>
              <Btn onClick={() => setComboModal(false)}>Huỷ</Btn>
              <Btn variant="primary" onClick={() => void submitCombo()}>
                Lưu
              </Btn>
            </>
          }
        >
          <Field label="Tên combo">
            <input
              className={inputClass}
              value={comboForm.comboName}
              onChange={(e) => setComboForm({ ...comboForm, comboName: e.target.value })}
            />
          </Field>
          <Field label="Giá (VNĐ)">
            <input
              type="number"
              className={inputClass}
              value={comboForm.price}
              onChange={(e) => setComboForm({ ...comboForm, price: Number(e.target.value) })}
            />
          </Field>
          <Field label="Mô tả">
            <textarea
              rows={3}
              className={inputClass}
              value={comboForm.description}
              onChange={(e) => setComboForm({ ...comboForm, description: e.target.value })}
            />
          </Field>
          <Field label="Ảnh (URL)">
            <input
              className={inputClass}
              value={comboForm.imageUrl}
              onChange={(e) => setComboForm({ ...comboForm, imageUrl: e.target.value })}
            />
          </Field>
          <Field label="Trạng thái">
            <select
              className={inputClass}
              value={comboForm.status}
              onChange={(e) =>
                setComboForm({ ...comboForm, status: e.target.value as 'ACTIVE' | 'INACTIVE' })
              }
            >
              <option value="ACTIVE">Đang bán</option>
              <option value="INACTIVE">Ngừng bán</option>
            </select>
          </Field>
        </Modal>
      )}

      {deleteProduct && (
        <ConfirmModal
          message={`Xoá sản phẩm "${deleteProduct.productName}"?`}
          confirmLabel="Xoá"
          onCancel={() => setDeleteProduct(null)}
          onConfirm={() => void confirmDeleteProduct()}
        />
      )}
      {deleteCombo && (
        <ConfirmModal
          message={`Xoá combo "${deleteCombo.comboName}"?`}
          confirmLabel="Xoá"
          onCancel={() => setDeleteCombo(null)}
          onConfirm={() => void confirmDeleteCombo()}
        />
      )}
    </div>
  );
}
