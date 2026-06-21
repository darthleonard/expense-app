import { Component, OnInit } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { ShoppingService } from '../../core/services/shopping.service';
import { DatabaseService, ProductCatalog, ProductCategory } from '../../core/services/database.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-products',
  templateUrl: './products.page.html',
  styleUrls: ['./products.page.scss'],
  standalone: false
})
export class ProductsPage implements OnInit {
  products: ProductCatalog[] = [];
  isModalOpen = false;
  editingProduct: ProductCatalog | null = null;
  current: Partial<ProductCatalog> = {};
  searchQuery = '';

  constructor(
    private shopping: ShoppingService,
    private alertCtrl: AlertController,
    private translate: TranslateService
  ) {}

  ngOnInit() {}

  async ionViewWillEnter() {
    await this.loadData();
  }

  async loadData() {
    const all = await this.shopping.getProducts();
    this.products = this.searchQuery
      ? all.filter(p => p.name.toLowerCase().includes(this.searchQuery.toLowerCase()))
      : all;
  }

  async onSearch() {
    await this.loadData();
  }

  openModal(product?: ProductCatalog) {
    if (product) {
      this.editingProduct = product;
      this.current = { ...product };
    } else {
      this.editingProduct = null;
      this.current = { category: 'gasto_variable', isActive: true };
    }
    this.isModalOpen = true;
  }

  async save() {
    if (!this.current.name?.trim()) return;
    try {
      await this.shopping.saveProduct({
        ...this.current,
        name: this.current.name!.trim(),
        category: this.current.category as ProductCategory || 'gasto_variable',
        isActive: this.current.isActive ?? true,
        creationDate: this.editingProduct?.creationDate || new Date().toISOString(),
        lastModDate: new Date().toISOString()
      });
      this.isModalOpen = false;
      await this.loadData();
    } catch (err: any) {
      if (err.message === 'PRODUCT_NAME_DUPLICATE') {
        const alert = await this.alertCtrl.create({
          header: await this.translate.get('DUPLICATE_PRODUCT').toPromise(),
          message: await this.translate.get('PRODUCT_EXISTS_REUSE').toPromise(),
          buttons: ['OK']
        });
        await alert.present();
      } else {
        throw err;
      }
    }
  }

  async confirmDelete(product: ProductCatalog) {
    const alert = await this.alertCtrl.create({
      header: await this.translate.get('DELETE').toPromise(),
      message: product.name.replace(/\b\w/g, c => c.toUpperCase()),
      buttons: [
        { text: await this.translate.get('CANCEL').toPromise(), role: 'cancel' },
        {
          text: await this.translate.get('DELETE').toPromise(),
          role: 'destructive',
          handler: async () => {
            await this.shopping.deleteProduct(product.id!);
            await this.loadData();
          }
        }
      ]
    });
    await alert.present();
  }

  getCategoryColor(cat: string) {
    return cat === 'gasto_fijo' ? 'tertiary' : 'warning';
  }
}
