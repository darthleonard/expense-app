import { Component, OnInit } from '@angular/core';
import { AlertController, IonModal } from '@ionic/angular';
import { ShoppingService } from '../../core/services/shopping.service';
import { DatabaseService, ProductCatalog, ProductCategory } from '../../core/services/database.service';
import { TranslateService } from '@ngx-translate/core';
import { HasChangesService } from '../../core/services/has-changes.service';
import { ViewChild } from '@angular/core';

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

  @ViewChild(IonModal) modal!: IonModal;

  constructor(
    private shopping: ShoppingService,
    private alertCtrl: AlertController,
    private translate: TranslateService,
    private hasChangesService: HasChangesService
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

  canDismiss = async (data?: any, role?: string) => {
    if (role === 'save') return true;
    
    const isChanged = this.hasChangesService.hasChanges(
      this.editingProduct || { category: 'gasto_variable', isActive: true },
      this.current
    );
    
    if (isChanged) {
      return await this.hasChangesService.confirmDiscard();
    }
    return true;
  };

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
      await this.modal.dismiss(null, 'save');
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
