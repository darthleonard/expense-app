import { Component, OnInit, ViewChild } from '@angular/core';
import { AlertController, IonModal } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { ExpenseCategoryTag } from '../core/services/database.service';
import { CategoryService } from '../core/services/category.service';
import { HasChangesService } from '../core/services/has-changes.service';

@Component({
  selector: 'app-categories',
  templateUrl: './categories.page.html',
  styleUrls: ['./categories.page.scss'],
  standalone: false,
})
export class CategoriesPage implements OnInit {
  categories: ExpenseCategoryTag[] = [];
  isModalOpen = false;
  isSaving = false;
  editingCategory: ExpenseCategoryTag | null = null;
  currentCategory: ExpenseCategoryTag = this.getDefaultCategory();

  readonly presetColors: string[] = [
    '#3880ff', // Primary blue
    '#3dc2ff', // Secondary sky
    '#5260ff', // Tertiary indigo
    '#2dd36f', // Success emerald
    '#10b981', // Teal/green
    '#ffc409', // Warning amber
    '#f59e0b', // Orange
    '#eb445a', // Danger red
    '#e11d48', // Rose
    '#ec4899', // Pink
    '#a855f7', // Purple
    '#8b5cf6', // Violet
  ];

  @ViewChild(IonModal) modal!: IonModal;

  constructor(
    private categoryService: CategoryService,
    private alertCtrl: AlertController,
    private translate: TranslateService,
    private hasChangesService: HasChangesService
  ) {}

  ngOnInit() {}

  async ionViewWillEnter() {
    await this.loadData();
  }

  async loadData() {
    this.categories = await this.categoryService.getCategories();
  }

  getDefaultCategory(): ExpenseCategoryTag {
    return {
      name: '',
      color: '#3880ff',
      creationDate: '',
      lastModDate: '',
    };
  }

  openModal(category?: ExpenseCategoryTag) {
    this.isSaving = false;
    if (category) {
      this.editingCategory = category;
      this.currentCategory = { ...category };
    } else {
      this.editingCategory = null;
      this.currentCategory = this.getDefaultCategory();
    }
    this.isModalOpen = true;
  }

  selectColor(color: string) {
    this.currentCategory.color = color;
  }

  canDismiss = async (data?: any, role?: string) => {
    if (role === 'save' || this.isSaving) return true;

    const isChanged = this.hasChangesService.hasChanges(
      this.editingCategory || this.getDefaultCategory(),
      this.currentCategory
    );

    if (isChanged) {
      return await this.hasChangesService.confirmDiscard();
    }
    return true;
  };

  async saveCategory() {
    if (!this.currentCategory.name?.trim()) return;

    this.isSaving = true;
    try {
      await this.categoryService.saveCategory({
        ...this.currentCategory,
        name: this.currentCategory.name.trim(),
        color: this.currentCategory.color || '#3880ff',
      });
      await this.modal.dismiss(null, 'save');
      this.editingCategory = null;
      this.currentCategory = this.getDefaultCategory();
      await this.loadData();
    } catch (err: any) {
      this.isSaving = false;
      if (err.message === 'CATEGORY_NAME_DUPLICATE') {
        const alert = await this.alertCtrl.create({
          header: this.translate.instant('DUPLICATE_CATEGORY'),
          message: this.translate.instant('CATEGORY_EXISTS'),
          buttons: ['OK'],
        });
        await alert.present();
      } else {
        console.error(err);
      }
    }
  }

  async deleteCategory(category: ExpenseCategoryTag) {
    if (!category.id) return;

    const inUse = await this.categoryService.isCategoryInUse(category.id);

    if (inUse) {
      const alert = await this.alertCtrl.create({
        header: this.translate.instant('DELETE_CATEGORY'),
        message: this.translate.instant('CATEGORY_IN_USE_WARNING'),
        buttons: [
          {
            text: this.translate.instant('CANCEL'),
            role: 'cancel',
          },
          {
            text: this.translate.instant('DELETE'),
            role: 'destructive',
            handler: async () => {
              await this.categoryService.deleteCategory(category.id!);
              await this.loadData();
            },
          },
        ],
      });
      await alert.present();
    } else {
      const alert = await this.alertCtrl.create({
        header: this.translate.instant('DELETE_CATEGORY'),
        message: this.translate.instant('DELETE_CATEGORY_CONFIRMATION'),
        buttons: [
          {
            text: this.translate.instant('CANCEL'),
            role: 'cancel',
          },
          {
            text: this.translate.instant('DELETE'),
            role: 'destructive',
            handler: async () => {
              await this.categoryService.deleteCategory(category.id!);
              await this.loadData();
            },
          },
        ],
      });
      await alert.present();
    }
  }
}
